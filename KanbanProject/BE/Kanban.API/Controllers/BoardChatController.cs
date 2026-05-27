using Kanban.API.DTOs.Chat;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/boards/{boardId:int}/chat/messages")]
public class BoardChatController : ApiControllerBase
{
    private readonly IChatService _chatService;
    private readonly IHubContext<BoardHub> _hubContext;

    public BoardChatController(IChatService chatService, IHubContext<BoardHub> hubContext)
    {
        _chatService = chatService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<BoardChatMessageDto>>> GetMessages(int boardId)
    {
        return Ok(await _chatService.GetMessagesAsync(CurrentUserId, boardId));
    }

    [HttpPost]
    public async Task<ActionResult<BoardChatMessageDto>> SendMessage(int boardId, SendBoardChatMessageRequest request)
    {
        var message = await _chatService.SendMessageAsync(CurrentUserId, boardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "ChatMessageAdded", CurrentUserId, new { message });
        return Ok(message);
    }
}
