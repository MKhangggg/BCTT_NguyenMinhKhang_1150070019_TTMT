using Kanban.API.DTOs.Member;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/boards/{boardId:int}/members")]
public class MembersController : ApiControllerBase
{
    private readonly IMemberService _memberService;

    public MembersController(IMemberService memberService)
    {
        _memberService = memberService;
    }

    [HttpGet]
    public async Task<ActionResult<List<BoardMemberDto>>> GetMembers(int boardId)
    {
        return Ok(await _memberService.GetMembersAsync(CurrentUserId, boardId));
    }

    [HttpPost]
    public async Task<ActionResult<BoardMemberDto>> AddMember(int boardId, AddMemberRequest request)
    {
        return Ok(await _memberService.AddMemberAsync(CurrentUserId, boardId, request));
    }

    [HttpPut("{memberId:int}/role")]
    public async Task<ActionResult<BoardMemberDto>> UpdateRole(int boardId, int memberId, UpdateMemberRoleRequest request)
    {
        return Ok(await _memberService.UpdateRoleAsync(CurrentUserId, boardId, memberId, request));
    }

    [HttpDelete("{memberId:int}")]
    public async Task<IActionResult> RemoveMember(int boardId, int memberId)
    {
        await _memberService.RemoveMemberAsync(CurrentUserId, boardId, memberId);
        return NoContent();
    }
}
