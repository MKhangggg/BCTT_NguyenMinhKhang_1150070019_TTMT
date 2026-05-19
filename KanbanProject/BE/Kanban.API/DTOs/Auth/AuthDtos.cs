using System.ComponentModel.DataAnnotations;

namespace Kanban.API.DTOs.Auth;

public record RegisterRequest(
    [Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải có từ 2 đến 100 ký tự.")]
    string FullName,
    [Required(ErrorMessage = "Tên đăng nhập là bắt buộc.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập phải có từ 3 đến 50 ký tự.")]
    string UserName,
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [StringLength(150, ErrorMessage = "Email không được vượt quá 150 ký tự.")]
    string Email,
    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
    string Password);

public record LoginRequest(
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    string Email,
    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    string Password);

public record UpdateProfileRequest(
    [Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải có từ 2 đến 100 ký tự.")]
    string FullName,
    [StringLength(500, ErrorMessage = "Link ảnh đại diện không được vượt quá 500 ký tự.")]
    string? AvatarUrl,
    [StringLength(120, ErrorMessage = "Phòng ban không được vượt quá 120 ký tự.")]
    string? Department,
    [StringLength(120, ErrorMessage = "Chức danh không được vượt quá 120 ký tự.")]
    string? JobTitle);

public record ChangePasswordRequest(
    [Required(ErrorMessage = "Mật khẩu hiện tại là bắt buộc.")]
    string CurrentPassword,
    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu mới phải có ít nhất 6 ký tự.")]
    string NewPassword);

public record UserResponse(
    int Id,
    string FullName,
    string UserName,
    string Email,
    string? AvatarUrl,
    string? Department,
    int? OrganizationUnitId,
    string? OrganizationUnitCode,
    string? OrganizationUnitName,
    string? JobTitle,
    bool IsSystemAdmin,
    bool IsActive);

public record AuthResponse(string Token, UserResponse User);
