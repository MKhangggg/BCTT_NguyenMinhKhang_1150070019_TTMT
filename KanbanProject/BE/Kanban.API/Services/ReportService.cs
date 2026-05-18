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
            cards.Count(c => c.Column.Name.Contains("Done", StringComparison.OrdinalIgnoreCase)),
            cards.Count(c => c.Column.Name.Contains("Progress", StringComparison.OrdinalIgnoreCase) || c.Column.Name.Contains("Doing", StringComparison.OrdinalIgnoreCase)),
            cards.Count(c => c.DueDate.HasValue && c.DueDate.Value.Date < DateTime.UtcNow.Date && !c.Column.Name.Contains("Done", StringComparison.OrdinalIgnoreCase)),
            cardsByColumn,
            cardsByPriority);
    }
}
