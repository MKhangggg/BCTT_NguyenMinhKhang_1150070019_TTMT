using System.ComponentModel.DataAnnotations;
using Kanban.API.Models;

namespace Kanban.API.DTOs.Organization;

public record OrganizationUnitMemberDto(
    int Id,
    int UserId,
    string FullName,
    string UserName,
    string Email,
    string? AvatarUrl,
    string? JobTitle,
    OrganizationUnitMemberRole Role,
    DateTime JoinedAt);

public record OrganizationUnitDto(
    int Id,
    string Code,
    string Name,
    string? Description,
    OrganizationUnitType Type,
    int? ParentId,
    string? ParentName,
    int? ManagerId,
    string? ManagerName,
    bool IsActive,
    int MemberCount,
    int BoardCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<OrganizationUnitMemberDto> Members);

public record OrganizationUnitOptionDto(
    int Id,
    string Code,
    string Name,
    OrganizationUnitType Type,
    int? ParentId,
    string? ParentName,
    int? ManagerId,
    string? ManagerName,
    int MemberCount);

public record SaveOrganizationUnitRequest(
    [Required(ErrorMessage = "Mã đơn vị là bắt buộc.")]
    [StringLength(40, MinimumLength = 2, ErrorMessage = "Mã đơn vị phải có từ 2 đến 40 ký tự.")]
    string Code,
    [Required(ErrorMessage = "Tên đơn vị là bắt buộc.")]
    [StringLength(160, MinimumLength = 2, ErrorMessage = "Tên đơn vị phải có từ 2 đến 160 ký tự.")]
    string Name,
    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    string? Description,
    OrganizationUnitType Type,
    int? ParentId,
    int? ManagerId,
    bool IsActive);

public record AddOrganizationUnitMemberRequest(
    int UserId,
    OrganizationUnitMemberRole Role);

public record UpdateOrganizationUnitMemberRequest(
    OrganizationUnitMemberRole Role);
