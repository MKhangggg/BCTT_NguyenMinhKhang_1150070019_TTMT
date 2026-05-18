using Kanban.API.Data;
using Kanban.API.DTOs.Report;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<BoardReportDto> GetBoardSummaryAsync(int userId, int boardId)
    {
        await BoardAccess.EnsureMemberAsync(_db, boardId, userId);

        var cards = await _db.Cards
            .AsNoTracking()
            .Include(c => c.Column)
            .Where(c => c.BoardId == boardId && !c.IsArchived)
            .ToListAsync();

        var cardsByColumn = cards
            .GroupBy(c => new { c.ColumnId, c.Column.Name })
            .Select(g => new ColumnCountDto(g.Key.ColumnId, g.Key.Name, g.Count()))
            .OrderBy(c => c.ColumnName)
            .ToList();

        var cardsByPriority = Enum.GetValues<CardPriority>()
            .Select(priority => new PriorityCountDto(priority, cards.Count(c => c.Priority == priority)))
            .ToList();

        return new BoardReportDto(
            boardId,
            cards.Count,
            cards.Count(c => IsCompletedColumn(c.Column.Name)),
            cards.Count(c => IsInProgressColumn(c.Column.Name)),
            cards.Count(c => c.DueDate.HasValue && c.DueDate.Value.Date < DateTime.UtcNow.Date && !IsCompletedColumn(c.Column.Name)),
            cardsByColumn,
            cardsByPriority);
    }

    private static bool IsCompletedColumn(string columnName)
    {
        return columnName.Contains("Done", StringComparison.OrdinalIgnoreCase)
            || columnName.Contains("Hoàn thành", StringComparison.OrdinalIgnoreCase)
            || columnName.Contains("Xong", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsInProgressColumn(string columnName)
    {
        return columnName.Contains("Progress", StringComparison.OrdinalIgnoreCase)
            || columnName.Contains("Doing", StringComparison.OrdinalIgnoreCase)
            || columnName.Contains("Đang làm", StringComparison.OrdinalIgnoreCase)
            || columnName.Contains("Đang thực hiện", StringComparison.OrdinalIgnoreCase);
    }
}
