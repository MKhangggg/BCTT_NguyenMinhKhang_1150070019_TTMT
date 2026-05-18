using Kanban.API.Data;
using Kanban.API.DTOs.Auth;
using Kanban.API.Helpers;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly JwtHelper _jwtHelper;

    public AuthService(AppDbContext db, JwtHelper jwtHelper)
    {
        _db = db;
        _jwtHelper = jwtHelper;
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
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive);
        if (user is null || !PasswordHelper.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");
        }

        return CreateAuthResponse(user);
    }

    public async Task<UserResponse> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");
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
            user.JobTitle,
            user.IsSystemAdmin,
            user.IsActive);
    }
}
