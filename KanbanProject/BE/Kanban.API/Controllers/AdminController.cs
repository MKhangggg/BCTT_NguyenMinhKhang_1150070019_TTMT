using Kanban.API.DTOs.Admin;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize(Roles = "SystemAdmin")]
[Route("api/admin")]
public class AdminController : ApiControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<AdminOverviewDto>> GetOverview()
    {
        return Ok(await _adminService.GetOverviewAsync(CurrentUserId));
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers([FromQuery] string? search)
    {
        return Ok(await _adminService.GetUsersAsync(CurrentUserId, search));
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserDto>> CreateUser(CreateUserByAdminRequest request)
    {
        return Ok(await _adminService.CreateUserAsync(CurrentUserId, request));
    }

    [HttpPut("users/{userId:int}")]
    public async Task<ActionResult<AdminUserDto>> UpdateUser(int userId, UpdateUserByAdminRequest request)
    {
        return Ok(await _adminService.UpdateUserAsync(CurrentUserId, userId, request));
    }

    [HttpPut("users/{userId:int}/status")]
    public async Task<ActionResult<AdminUserDto>> SetStatus(int userId, SetUserStatusRequest request)
    {
        return Ok(await _adminService.SetUserStatusAsync(CurrentUserId, userId, request));
    }

    [HttpPut("users/{userId:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int userId, ResetUserPasswordRequest request)
    {
        await _adminService.ResetPasswordAsync(CurrentUserId, userId, request);
        return NoContent();
    }
}
