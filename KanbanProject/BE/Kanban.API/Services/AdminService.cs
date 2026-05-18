using Kanban.API.Common;
using Kanban.API.Data;
using Kanban.API.DTOs.Admin;
using Kanban.API.Helpers;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AdminOverviewDto> GetOverviewAsync(int currentUserId)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var now = DateTime.UtcNow;

        return new AdminOverviewDto(
            await _db.Users.CountAsync(),
            await _db.Users.CountAsync(u => u.IsActive),
            await _db.Users.CountAsync(u => !u.IsActive),
            await _db.Users.CountAsync(u => u.IsSystemAdmin),
            await _db.Boards.CountAsync(),
            await _db.Cards.CountAsync(c => !c.IsArchived),
            await _db.Cards.CountAsync(c => !c.IsArchived && c.DueDate != null && c.DueDate < now));
    }

    public async Task<List<AdminUserDto>> GetUsersAsync(int currentUserId, string? search)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(keyword) ||
                u.UserName.ToLower().Contains(keyword) ||
                u.Email.ToLower().Contains(keyword) ||
                (u.Department != null && u.Department.ToLower().Contains(keyword)) ||
                (u.JobTitle != null && u.JobTitle.ToLower().Contains(keyword)));
        }

        var users = await query
            .OrderByDescending(u => u.IsSystemAdmin)
            .ThenByDescending(u => u.IsActive)
            .ThenBy(u => u.FullName)
            .Select(u => new AdminUserDto(
                u.Id,
                u.FullName,
                u.UserName,
                u.Email,
                u.AvatarUrl,
                u.Department,
                u.JobTitle,
                u.IsSystemAdmin,
                u.IsActive,
                u.CreatedAt,
                u.UpdatedAt,
                u.OwnedBoards.Count,
                u.BoardMembers.Count,
                u.AssignedCards.Count(c => !c.IsArchived)))
            .ToListAsync();

        return users;
    }

    public async Task<AdminUserDto> CreateUserAsync(int currentUserId, CreateUserByAdminRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        await EnsureUniqueAsync(request.Email, request.UserName);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            UserName = request.UserName.Trim().ToLowerInvariant(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = PasswordHelper.HashPassword(request.Password),
            Department = Normalize(request.Department),
            JobTitle = Normalize(request.JobTitle),
            IsSystemAdmin = request.IsSystemAdmin,
            IsActive = request.IsActive
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return await GetUserDtoAsync(user.Id);
    }

    public async Task<AdminUserDto> UpdateUserAsync(int currentUserId, int userId, UpdateUserByAdminRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var user = await _db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        await EnsureUniqueAsync(request.Email, request.UserName, userId);
        await EnsureLastAdminIsNotRemovedAsync(user, request.IsSystemAdmin, request.IsActive);

        user.FullName = request.FullName.Trim();
        user.UserName = request.UserName.Trim().ToLowerInvariant();
        user.Email = request.Email.Trim().ToLowerInvariant();
        user.AvatarUrl = Normalize(request.AvatarUrl);
        user.Department = Normalize(request.Department);
        user.JobTitle = Normalize(request.JobTitle);
        user.IsSystemAdmin = request.IsSystemAdmin;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetUserDtoAsync(userId);
    }

    public async Task<AdminUserDto> SetUserStatusAsync(int currentUserId, int userId, SetUserStatusRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        if (currentUserId == userId && !request.IsActive)
        {
            throw new InvalidOperationException("You cannot deactivate your own account.");
        }

        var user = await _db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        await EnsureLastAdminIsNotRemovedAsync(user, user.IsSystemAdmin, request.IsActive);
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetUserDtoAsync(userId);
    }

    public async Task ResetPasswordAsync(int currentUserId, int userId, ResetUserPasswordRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            throw new InvalidOperationException("New password must have at least 6 characters.");
        }

        var user = await _db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task EnsureSystemAdminAsync(int userId)
    {
        var isAdmin = await _db.Users.AnyAsync(u => u.Id == userId && u.IsActive && u.IsSystemAdmin);
        if (!isAdmin)
        {
            throw new ForbiddenException("System admin permission is required.");
        }
    }

    private async Task EnsureUniqueAsync(string email, string userName, int? exceptUserId = null)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedUserName = userName.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail && u.Id != exceptUserId))
        {
            throw new InvalidOperationException("Email is already used.");
        }

        if (await _db.Users.AnyAsync(u => u.UserName == normalizedUserName && u.Id != exceptUserId))
        {
            throw new InvalidOperationException("Username is already used.");
        }
    }

    private async Task EnsureLastAdminIsNotRemovedAsync(User user, bool nextIsAdmin, bool nextIsActive)
    {
        if (!user.IsSystemAdmin || (nextIsAdmin && nextIsActive))
        {
            return;
        }

        var otherAdmins = await _db.Users.AnyAsync(u => u.Id != user.Id && u.IsActive && u.IsSystemAdmin);
        if (!otherAdmins)
        {
            throw new InvalidOperationException("At least one active system admin is required.");
        }
    }

    private async Task<AdminUserDto> GetUserDtoAsync(int userId)
    {
        return await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new AdminUserDto(
                u.Id,
                u.FullName,
                u.UserName,
                u.Email,
                u.AvatarUrl,
                u.Department,
                u.JobTitle,
                u.IsSystemAdmin,
                u.IsActive,
                u.CreatedAt,
                u.UpdatedAt,
                u.OwnedBoards.Count,
                u.BoardMembers.Count,
                u.AssignedCards.Count(c => !c.IsArchived)))
            .FirstAsync();
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
