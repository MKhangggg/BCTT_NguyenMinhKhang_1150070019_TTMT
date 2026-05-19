using Kanban.API.DTOs.Auth;

namespace Kanban.API.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserResponse> GetCurrentUserAsync(int userId);
    Task<UserResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<UserResponse> UploadAvatarAsync(int userId, IFormFile file, string publicBaseUrl);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
}
