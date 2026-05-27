using Kanban.API.DTOs.Chat;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/chat")]
public class DirectChatController : ApiControllerBase
{
    private readonly IChatService _chatService;
    private readonly IHubContext<BoardHub> _hubContext;

    public DirectChatController(IChatService chatService, IHubContext<BoardHub> hubContext)
    {
        _chatService = chatService;
        _hubContext = hubContext;
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<ChatUserDto>>> GetUsers()
    {
        return Ok(await _chatService.GetDirectChatUsersAsync(CurrentUserId));
    }

    [HttpGet("users/{userId:int}/messages")]
    public async Task<ActionResult<List<DirectMessageDto>>> GetMessages(int userId)
    {
        return Ok(await _chatService.GetDirectMessagesAsync(CurrentUserId, userId));
    }

    [HttpPost("users/{userId:int}/messages")]
    public async Task<ActionResult<DirectMessageDto>> SendMessage(int userId, SendDirectMessageRequest request)
    {
        var message = await _chatService.SendDirectMessageAsync(CurrentUserId, userId, request);
        await BoardRealtime.BroadcastDirectMessageAsync(_hubContext, message.SenderId, message.RecipientId, "DirectMessageSent", CurrentUserId, new { message });
        return Ok(message);
    }
}
