using Kanban.API.DTOs.Report;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api/reports")]
public class ReportsController : ApiControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("boards/{boardId:int}/summary")]
    public async Task<ActionResult<BoardReportDto>> GetBoardSummary(int boardId)
    {
        return Ok(await _reportService.GetBoardSummaryAsync(CurrentUserId, boardId));
    }
}
