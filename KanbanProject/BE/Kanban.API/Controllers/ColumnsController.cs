using Kanban.API.DTOs.Column;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api")]
public class ColumnsController : ApiControllerBase
{
    private readonly IColumnService _columnService;
    private readonly IHubContext<BoardHub> _hubContext;

    public ColumnsController(IColumnService columnService, IHubContext<BoardHub> hubContext)
    {
        _columnService = columnService;
        _hubContext = hubContext;
    }

    [HttpPost("boards/{boardId:int}/columns")]
    public async Task<ActionResult<BoardColumnDto>> CreateColumn(int boardId, CreateColumnRequest request)
    {
        var column = await _columnService.CreateColumnAsync(CurrentUserId, boardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "ColumnCreated", CurrentUserId, new { columnId = column.Id });
        return Ok(column);
    }

    [HttpPut("columns/{columnId:int}")]
    public async Task<ActionResult<BoardColumnDto>> UpdateColumn(int columnId, UpdateColumnRequest request)
    {
        var column = await _columnService.UpdateColumnAsync(CurrentUserId, columnId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, column.BoardId, "ColumnUpdated", CurrentUserId, new { columnId });
        return Ok(column);
    }

    [HttpDelete("columns/{columnId:int}")]
    public async Task<IActionResult> DeleteColumn(int columnId)
    {
        var boardId = await _columnService.DeleteColumnAsync(CurrentUserId, columnId);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "ColumnDeleted", CurrentUserId, new { columnId });
        return NoContent();
    }

    [HttpPut("columns/reorder")]
    public async Task<IActionResult> ReorderColumns(ReorderColumnsRequest request)
    {
        var boardId = await _columnService.ReorderColumnsAsync(CurrentUserId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "ColumnsReordered", CurrentUserId, new { request.Columns });
        return NoContent();
    }
}
