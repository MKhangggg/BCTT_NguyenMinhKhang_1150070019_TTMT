using Kanban.API.DTOs.Member;

namespace Kanban.API.Interfaces;

public interface IMemberService
{
    Task<List<BoardMemberDto>> GetMembersAsync(int userId, int boardId);
    Task<List<MemberCandidateDto>> GetMemberCandidatesAsync(int userId, int boardId, string? search);
    Task<BoardMemberDto> AddMemberAsync(int userId, int boardId, AddMemberRequest request);
    Task<List<BoardMemberDto>> AddOrganizationUnitMembersAsync(int userId, int boardId, AddOrganizationUnitMembersRequest request);
    Task<BoardMemberDto> UpdateRoleAsync(int userId, int boardId, int memberId, UpdateMemberRoleRequest request);
    Task RemoveMemberAsync(int userId, int boardId, int memberId);
}
