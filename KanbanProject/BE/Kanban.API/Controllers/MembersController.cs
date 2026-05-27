using Kanban.API.DTOs.Member;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/boards/{boardId:int}/members")]
public class MembersController : ApiControllerBase
{
    private readonly IMemberService _memberService;
    private readonly IHubContext<BoardHub> _hubContext;

    public MembersController(IMemberService memberService, IHubContext<BoardHub> hubContext)
    {
        _memberService = memberService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<BoardMemberDto>>> GetMembers(int boardId)
    {
        return Ok(await _memberService.GetMembersAsync(CurrentUserId, boardId));
    }

    [HttpGet("candidates")]
    public async Task<ActionResult<List<MemberCandidateDto>>> GetMemberCandidates(int boardId, [FromQuery] string? search)
    {
        return Ok(await _memberService.GetMemberCandidatesAsync(CurrentUserId, boardId, search));
    }

    [HttpPost]
    public async Task<ActionResult<BoardMemberDto>> AddMember(int boardId, AddMemberRequest request)
    {
        var member = await _memberService.AddMemberAsync(CurrentUserId, boardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "MemberAdded", CurrentUserId, new { member });
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectMembershipChanged", CurrentUserId, new { boardId, userId = member.UserId });
        return Ok(member);
    }

    [HttpPost("organization-unit")]
    public async Task<ActionResult<List<BoardMemberDto>>> AddOrganizationUnitMembers(int boardId, AddOrganizationUnitMembersRequest request)
    {
        var members = await _memberService.AddOrganizationUnitMembersAsync(CurrentUserId, boardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "MembersAdded", CurrentUserId, new { members });
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectMembershipChanged", CurrentUserId, new { boardId });
        return Ok(members);
    }

    [HttpPut("{memberId:int}/role")]
    public async Task<ActionResult<BoardMemberDto>> UpdateRole(int boardId, int memberId, UpdateMemberRoleRequest request)
    {
        var member = await _memberService.UpdateRoleAsync(CurrentUserId, boardId, memberId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "MemberRoleUpdated", CurrentUserId, new { member });
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectMembershipChanged", CurrentUserId, new { boardId, userId = member.UserId });
        return Ok(member);
    }

    [HttpDelete("{memberId:int}")]
    public async Task<IActionResult> RemoveMember(int boardId, int memberId)
    {
        await _memberService.RemoveMemberAsync(CurrentUserId, boardId, memberId);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "MemberRemoved", CurrentUserId, new { memberId });
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectMembershipChanged", CurrentUserId, new { boardId, memberId });
        return NoContent();
    }
}
