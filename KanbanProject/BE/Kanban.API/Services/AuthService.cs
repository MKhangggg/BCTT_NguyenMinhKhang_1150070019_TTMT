using Kanban.API.Data;
using Kanban.API.DTOs.Auth;
using Kanban.API.Helpers;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class AuthService : IAuthService
{
    private static readonly Dictionary<string, string> AllowedAvatarTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif"
    };

    private readonly AppDbContext _db;
    private readonly JwtHelper _jwtHelper;
    private readonly IWebHostEnvironment _environment;

    public AuthService(AppDbContext db, JwtHelper jwtHelper, IWebHostEnvironment environment)
    {
        _db = db;
        _jwtHelper = jwtHelper;
        _environment = environment;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new InvalidOperationException("Email và mật khẩu là bắt buộc.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var userName = request.UserName.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email))
        {
            throw new InvalidOperationException("Email đã được sử dụng.");
        }

        if (await _db.Users.AnyAsync(u => u.UserName == userName))
        {
            throw new InvalidOperationException("Tên đăng nhập đã được sử dụng.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            UserName = userName,
            Email = email,
            PasswordHash = PasswordHelper.HashPassword(request.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .Include(u => u.OrganizationUnit)
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive);
        if (user is null || !PasswordHelper.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");
        }

        return CreateAuthResponse(user);
    }

    public async Task<UserResponse> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users
            .Include(u => u.OrganizationUnit)
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
        return ToUserResponse(user);
    }

    public async Task<UserResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _db.Users
            .Include(u => u.OrganizationUnit)
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

        user.FullName = request.FullName.Trim();
        user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        user.Department = user.OrganizationUnit?.Name ?? (string.IsNullOrWhiteSpace(request.Department) ? null : request.Department.Trim());
        user.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? null : request.JobTitle.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToUserResponse(user);
    }

    public async Task<UserResponse> UploadAvatarAsync(int userId, IFormFile file, string publicBaseUrl)
    {
        if (file.Length == 0)
        {
            throw new InvalidOperationException("Vui lòng chọn ảnh đại diện.");
        }

        if (file.Length > 2 * 1024 * 1024)
        {
            throw new InvalidOperationException("Ảnh đại diện không được vượt quá 2 MB.");
        }

        if (!AllowedAvatarTypes.TryGetValue(file.ContentType.ToLowerInvariant(), out var extension))
        {
            throw new InvalidOperationException("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.");
        }

        var user = await _db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
        var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var avatarDirectory = Path.Combine(webRoot, "uploads", "avatars");
        Directory.CreateDirectory(avatarDirectory);

        DeleteOldLocalAvatar(user.AvatarUrl, publicBaseUrl, avatarDirectory);

        var fileName = $"{userId}-{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(avatarDirectory, fileName);
        await using (var stream = File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        user.AvatarUrl = $"{publicBaseUrl.TrimEnd('/')}/uploads/avatars/{fileName}";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.OrganizationUnit).LoadAsync();
        return ToUserResponse(user);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
        if (!PasswordHelper.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Mật khẩu hiện tại không đúng.");
        }

        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        return new AuthResponse(_jwtHelper.GenerateToken(user), ToUserResponse(user));
    }

    private static UserResponse ToUserResponse(User user)
    {
        return new UserResponse(
            user.Id,
            user.FullName,
            user.UserName,
            user.Email,
            user.AvatarUrl,
            user.Department,
            user.OrganizationUnitId,
            user.OrganizationUnit?.Code,
            user.OrganizationUnit?.Name,
            user.JobTitle,
            user.IsSystemAdmin,
            user.IsActive);
    }

    private static void DeleteOldLocalAvatar(string? avatarUrl, string publicBaseUrl, string avatarDirectory)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl) || !avatarUrl.StartsWith(publicBaseUrl, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var marker = "/uploads/avatars/";
        var markerIndex = avatarUrl.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            return;
        }

        var fileName = Path.GetFileName(avatarUrl[(markerIndex + marker.Length)..]);
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        var fullPath = Path.GetFullPath(Path.Combine(avatarDirectory, fileName));
        var safeRoot = Path.GetFullPath(avatarDirectory);
        if (!fullPath.StartsWith(safeRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
        {
            return;
        }

        File.Delete(fullPath);
    }
}
