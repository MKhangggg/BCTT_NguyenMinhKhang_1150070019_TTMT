using Kanban.API.DTOs.Organization;

namespace Kanban.API.Interfaces;

public interface IOrganizationService
{
    Task<List<OrganizationUnitDto>> GetUnitsAsync(int currentUserId, bool includeInactive);
    Task<List<OrganizationUnitOptionDto>> GetUnitOptionsAsync(int currentUserId, bool includeInactive);
    Task<OrganizationUnitDto> CreateUnitAsync(int currentUserId, SaveOrganizationUnitRequest request);
    Task<OrganizationUnitDto> UpdateUnitAsync(int currentUserId, int unitId, SaveOrganizationUnitRequest request);
    Task<OrganizationUnitDto> AddMemberAsync(int currentUserId, int unitId, AddOrganizationUnitMemberRequest request);
    Task<OrganizationUnitDto> UpdateMemberRoleAsync(int currentUserId, int unitId, int memberId, UpdateOrganizationUnitMemberRequest request);
    Task<OrganizationUnitDto> RemoveMemberAsync(int currentUserId, int unitId, int memberId);
}
