using Kanban.API.DTOs.Member;

namespace Kanban.API.Interfaces;

public interface IMemberService
{
    Task<List<BoardMemberDto>> GetMembersAsync(int userId, int boardId);
    Task<BoardMemberDto> AddMemberAsync(int userId, int boardId, AddMemberRequest request);
    Task<List<BoardMemberDto>> AddOrganizationUnitMembersAsync(int userId, int boardId, AddOrganizationUnitMembersRequest request);
    Task<BoardMemberDto> UpdateRoleAsync(int userId, int boardId, int memberId, UpdateMemberRoleRequest request);
    Task RemoveMemberAsync(int userId, int boardId, int memberId);
}
