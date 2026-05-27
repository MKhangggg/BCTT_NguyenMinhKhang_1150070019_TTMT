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
            .GroupBy(c => new
            {
                c.ColumnId,
                c.Column.Name,
                c.Column.Position,
                IsDone = ColumnProgressHelper.IsCompletedColumn(c.Column)
            })
            .Select(g => new ColumnCountDto(g.Key.ColumnId, g.Key.Name, g.Count(), g.Key.IsDone))
            .OrderBy(c => cards.First(card => card.ColumnId == c.ColumnId).Column.Position)
            .ToList();

        var cardsByPriority = Enum.GetValues<CardPriority>()
            .Select(priority => new PriorityCountDto(priority, cards.Count(c => c.Priority == priority)))
            .ToList();
        var today = DateTime.UtcNow.Date;
        var completedCards = cards.Count(c => ColumnProgressHelper.IsCompletedColumn(c.Column));
        var overdueCards = cards.Count(c => c.DueDate.HasValue && c.DueDate.Value.Date < today && !ColumnProgressHelper.IsCompletedColumn(c.Column));

        return new BoardReportDto(
            boardId,
            cards.Count,
            completedCards,
            cards.Count(c => !ColumnProgressHelper.IsCompletedColumn(c.Column)),
            overdueCards,
            cardsByColumn,
            cardsByPriority);
    }
}
