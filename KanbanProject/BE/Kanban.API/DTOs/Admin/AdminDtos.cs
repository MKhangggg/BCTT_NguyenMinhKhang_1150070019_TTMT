namespace Kanban.API.DTOs.Admin;

public record AdminUserDto(
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
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int OwnedBoardCount,
    int JoinedBoardCount,
    int AssignedCardCount);

public record CreateUserByAdminRequest(
    string FullName,
    string UserName,
    string Email,
    string Password,
    string? Department,
    int? OrganizationUnitId,
    string? JobTitle,
    bool IsSystemAdmin,
    bool IsActive);

public record UpdateUserByAdminRequest(
    string FullName,
    string UserName,
    string Email,
    string? AvatarUrl,
    string? Department,
    int? OrganizationUnitId,
    string? JobTitle,
    bool IsSystemAdmin,
    bool IsActive);

public record SetUserStatusRequest(bool IsActive);

public record ResetUserPasswordRequest(string NewPassword);

public record AdminOverviewDto(
    int TotalUsers,
    int ActiveUsers,
    int InactiveUsers,
    int SystemAdmins,
    int OrganizationUnits,
    int Teams,
    int TotalBoards,
    int TotalCards,
    int OverdueCards);
