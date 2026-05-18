using Kanban.API.DTOs.Board;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/boards")]
public class BoardsController : ApiControllerBase
{
    private readonly IBoardService _boardService;

    public BoardsController(IBoardService boardService)
    {
        _boardService = boardService;
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
        return CreatedAtAction(nameof(GetBoard), new { id = board.Id }, board);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BoardDetailDto>> UpdateBoard(int id, UpdateBoardRequest request)
    {
        return Ok(await _boardService.UpdateBoardAsync(CurrentUserId, id, request));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBoard(int id)
    {
        await _boardService.DeleteBoardAsync(CurrentUserId, id);
        return NoContent();
    }
}
