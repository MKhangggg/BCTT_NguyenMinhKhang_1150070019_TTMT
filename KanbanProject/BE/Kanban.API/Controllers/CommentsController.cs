using Kanban.API.DTOs.Comment;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api")]
public class CommentsController : ApiControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpGet("cards/{cardId:int}/comments")]
    public async Task<ActionResult<List<CommentDto>>> GetComments(int cardId)
    {
        return Ok(await _commentService.GetCommentsAsync(CurrentUserId, cardId));
    }

    [HttpPost("cards/{cardId:int}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(int cardId, CreateCommentRequest request)
    {
        return Ok(await _commentService.AddCommentAsync(CurrentUserId, cardId, request));
    }

    [HttpDelete("comments/{commentId:int}")]
    public async Task<IActionResult> DeleteComment(int commentId)
    {
        await _commentService.DeleteCommentAsync(CurrentUserId, commentId);
        return NoContent();
    }
}
