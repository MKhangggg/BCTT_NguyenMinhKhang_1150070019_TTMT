using Kanban.API.DTOs.Report;

namespace Kanban.API.Interfaces;

public interface IReportService
{
    Task<BoardReportDto> GetBoardSummaryAsync(int userId, int boardId);
}
