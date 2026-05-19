using Kanban.API.Models;

namespace Kanban.API.DTOs.Member;

public record BoardMemberDto(int Id, int BoardId, int UserId, string FullName, string UserName, string Email, string? AvatarUrl, BoardRole Role, DateTime JoinedAt);

public record AddMemberRequest(string Email, BoardRole Role);

public record UpdateMemberRoleRequest(BoardRole Role);

public record AddOrganizationUnitMembersRequest(int OrganizationUnitId, BoardRole Role, bool PromoteLeadsToAdmin = true);
