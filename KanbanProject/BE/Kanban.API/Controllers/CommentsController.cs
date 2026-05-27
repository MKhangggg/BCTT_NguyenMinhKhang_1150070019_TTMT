using Kanban.API.DTOs.Comment;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api")]
public class CommentsController : ApiControllerBase
{
    private readonly ICommentService _commentService;
    private readonly IHubContext<BoardHub> _hubContext;

    public CommentsController(ICommentService commentService, IHubContext<BoardHub> hubContext)
    {
        _commentService = commentService;
        _hubContext = hubContext;
    }

    [HttpGet("cards/{cardId:int}/comments")]
    public async Task<ActionResult<List<CommentDto>>> GetComments(int cardId)
    {
        return Ok(await _commentService.GetCommentsAsync(CurrentUserId, cardId));
    }

    [HttpPost("cards/{cardId:int}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(int cardId, CreateCommentRequest request)
    {
        var comment = await _commentService.AddCommentAsync(CurrentUserId, cardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, comment.BoardId, "CommentAdded", CurrentUserId, new { cardId, comment });
        return Ok(comment);
    }

    [HttpDelete("comments/{commentId:int}")]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        var deleted = await _commentService.DeleteCommentAsync(CurrentUserId, commentId);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, deleted.BoardId, "CommentDeleted", CurrentUserId, new { cardId = deleted.CardId, commentId = deleted.Id });
        return NoContent();
    }
}
