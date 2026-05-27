using Kanban.API.DTOs.Board;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/boards")]
public class BoardsController : ApiControllerBase
{
    private readonly IBoardService _boardService;
    private readonly IHubContext<BoardHub> _hubContext;

    public BoardsController(IBoardService boardService, IHubContext<BoardHub> hubContext)
    {
        _boardService = boardService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<BoardSummaryDto>>> GetBoards()
    {
        return Ok(await _boardService.GetBoardsAsync(CurrentUserId));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BoardDetailDto>> GetBoard(int id)
    {
        return Ok(await _boardService.GetBoardAsync(CurrentUserId, id));
    }

    [HttpPost]
    public async Task<ActionResult<BoardDetailDto>> CreateBoard(CreateBoardRequest request)
    {
        var board = await _boardService.CreateBoardAsync(CurrentUserId, request);
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectCreated", CurrentUserId, new { boardId = board.Id });
        return CreatedAtAction(nameof(GetBoard), new { id = board.Id }, board);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BoardDetailDto>> UpdateBoard(int id, UpdateBoardRequest request)
    {
        var board = await _boardService.UpdateBoardAsync(CurrentUserId, id, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, id, "ProjectOverviewUpdated", CurrentUserId, new { board });
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectUpdated", CurrentUserId, new { boardId = board.Id });
        return Ok(board);
    }

    [HttpPost("{id:int}/documents")]
    public async Task<ActionResult<ProjectDocumentDto>> AddProjectDocument(int id, CreateProjectDocumentRequest request)
    {
        var document = await _boardService.AddProjectDocumentAsync(CurrentUserId, id, request);
        var board = await _boardService.GetBoardAsync(CurrentUserId, id);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, id, "ProjectDocumentAdded", CurrentUserId, new { documentId = document.Id, board });
        return Ok(document);
    }

    [HttpDelete("{id:int}/documents/{documentId:int}")]
    public async Task<IActionResult> DeleteProjectDocument(int id, int documentId)
    {
        await _boardService.DeleteProjectDocumentAsync(CurrentUserId, id, documentId);
        var board = await _boardService.GetBoardAsync(CurrentUserId, id);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, id, "ProjectDocumentDeleted", CurrentUserId, new { documentId, board });
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBoard(int id)
    {
        await _boardService.DeleteBoardAsync(CurrentUserId, id);
        await BoardRealtime.BroadcastBoardListChangedAsync(_hubContext, "ProjectDeleted", CurrentUserId, new { boardId = id });
        return NoContent();
    }
}
