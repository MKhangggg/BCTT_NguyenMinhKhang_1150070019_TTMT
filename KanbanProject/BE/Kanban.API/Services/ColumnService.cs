using Kanban.API.Data;
using Kanban.API.DTOs.Column;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class ColumnService : IColumnService
{
    private readonly AppDbContext _db;

    public ColumnService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<BoardColumnDto> CreateColumnAsync(int userId, int boardId, CreateColumnRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        var position = request.Position ?? await NextPositionAsync(boardId);
        var column = new BoardColumn
        {
            BoardId = boardId,
            Name = request.Name.Trim(),
            Position = position,
            WipLimit = request.WipLimit
        };

        _db.BoardColumns.Add(column);
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "CreateColumn",
            Description = $"Tạo cột {column.Name}"
        });
        await _db.SaveChangesAsync();

        return (await LoadColumnAsync(column.Id)).ToDto();
    }

    public async Task<BoardColumnDto> UpdateColumnAsync(int userId, int columnId, UpdateColumnRequest request)
    {
        var column = await _db.BoardColumns.FindAsync(columnId) ?? throw new KeyNotFoundException("Không tìm thấy cột.");
        await BoardAccess.EnsureCanManageBoardAsync(_db, column.BoardId, userId);

        column.Name = request.Name.Trim();
        column.Position = request.Position;
        column.WipLimit = request.WipLimit;
        column.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (await LoadColumnAsync(columnId)).ToDto();
    }

    public async Task<int> DeleteColumnAsync(int userId, int columnId)
    {
        var column = await _db.BoardColumns.FindAsync(columnId) ?? throw new KeyNotFoundException("Không tìm thấy cột.");
        await BoardAccess.EnsureCanManageBoardAsync(_db, column.BoardId, userId);
        var boardId = column.BoardId;

        if (await _db.Cards.AnyAsync(c => c.ColumnId == columnId))
        {
            throw new InvalidOperationException("Không thể xóa cột còn thẻ. Hãy di chuyển hoặc xóa thẻ trước.");
        }

        _db.BoardColumns.Remove(column);
        await _db.SaveChangesAsync();
        return boardId;
    }

    public async Task<int> ReorderColumnsAsync(int userId, ReorderColumnsRequest request)
    {
        if (request.Columns.Count == 0)
        {
            return 0;
        }

        var ids = request.Columns.Select(c => c.ColumnId).ToList();
        var columns = await _db.BoardColumns.Where(c => ids.Contains(c.Id)).ToListAsync();
        if (columns.Count != ids.Count)
        {
            throw new KeyNotFoundException("Danh sách cột không hợp lệ.");
        }

        var boardId = columns.First().BoardId;
        if (columns.Any(c => c.BoardId != boardId))
        {
            throw new InvalidOperationException("Chỉ được sắp xếp cột trong cùng bảng.");
        }

        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        foreach (var item in request.Columns)
        {
            var column = columns.First(c => c.Id == item.ColumnId);
            column.Position = item.Position;
            column.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return boardId;
    }

    private async Task<int> NextPositionAsync(int boardId)
    {
        var max = await _db.BoardColumns
            .Where(c => c.BoardId == boardId)
            .MaxAsync(c => (int?)c.Position);
        return (max ?? 0) + 1;
    }

    private async Task<BoardColumn> LoadColumnAsync(int columnId)
    {
        return await _db.BoardColumns
            .AsNoTracking()
            .Include(c => c.Cards).ThenInclude(c => c.Assignee)
            .Include(c => c.Cards).ThenInclude(c => c.Labels)
            .FirstOrDefaultAsync(c => c.Id == columnId)
            ?? throw new KeyNotFoundException("Không tìm thấy cột.");
    }
}
