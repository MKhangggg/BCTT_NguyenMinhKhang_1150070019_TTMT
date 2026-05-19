using Kanban.API.DTOs.Organization;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/organization")]
public class OrganizationController : ApiControllerBase
{
    private readonly IOrganizationService _organizationService;

    public OrganizationController(IOrganizationService organizationService)
    {
        _organizationService = organizationService;
    }

    [HttpGet("units")]
    public async Task<ActionResult<List<OrganizationUnitDto>>> GetUnits([FromQuery] bool includeInactive = false)
    {
        return Ok(await _organizationService.GetUnitsAsync(CurrentUserId, includeInactive));
    }

    [HttpGet("units/options")]
    public async Task<ActionResult<List<OrganizationUnitOptionDto>>> GetUnitOptions([FromQuery] bool includeInactive = false)
    {
        return Ok(await _organizationService.GetUnitOptionsAsync(CurrentUserId, includeInactive));
    }

    [Authorize(Roles = "SystemAdmin")]
    [HttpPost("units")]
    public async Task<ActionResult<OrganizationUnitDto>> CreateUnit(SaveOrganizationUnitRequest request)
    {
        return Ok(await _organizationService.CreateUnitAsync(CurrentUserId, request));
    }

    [Authorize(Roles = "SystemAdmin")]
    [HttpPut("units/{unitId:int}")]
    public async Task<ActionResult<OrganizationUnitDto>> UpdateUnit(int unitId, SaveOrganizationUnitRequest request)
    {
        return Ok(await _organizationService.UpdateUnitAsync(CurrentUserId, unitId, request));
    }

    [Authorize(Roles = "SystemAdmin")]
    [HttpPost("units/{unitId:int}/members")]
    public async Task<ActionResult<OrganizationUnitDto>> AddMember(int unitId, AddOrganizationUnitMemberRequest request)
    {
        return Ok(await _organizationService.AddMemberAsync(CurrentUserId, unitId, request));
    }

    [Authorize(Roles = "SystemAdmin")]
    [HttpPut("units/{unitId:int}/members/{memberId:int}/role")]
    public async Task<ActionResult<OrganizationUnitDto>> UpdateMemberRole(int unitId, int memberId, UpdateOrganizationUnitMemberRequest request)
    {
        return Ok(await _organizationService.UpdateMemberRoleAsync(CurrentUserId, unitId, memberId, request));
    }

    [Authorize(Roles = "SystemAdmin")]
    [HttpDelete("units/{unitId:int}/members/{memberId:int}")]
    public async Task<ActionResult<OrganizationUnitDto>> RemoveMember(int unitId, int memberId)
    {
        return Ok(await _organizationService.RemoveMemberAsync(CurrentUserId, unitId, memberId));
    }
}
