using Kanban.API.DTOs.Admin;

namespace Kanban.API.Interfaces;

public interface IAdminService
{
    Task<AdminOverviewDto> GetOverviewAsync(int currentUserId);
    Task<List<AdminUserDto>> GetUsersAsync(int currentUserId, string? search);
    Task<AdminUserDto> CreateUserAsync(int currentUserId, CreateUserByAdminRequest request);
    Task<AdminUserDto> UpdateUserAsync(int currentUserId, int userId, UpdateUserByAdminRequest request);
    Task<AdminUserDto> SetUserStatusAsync(int currentUserId, int userId, SetUserStatusRequest request);
    Task ResetPasswordAsync(int currentUserId, int userId, ResetUserPasswordRequest request);
}
