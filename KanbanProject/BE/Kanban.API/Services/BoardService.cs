using Kanban.API.Data;
using Kanban.API.DTOs.Board;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class BoardService : IBoardService
{
    private readonly AppDbContext _db;

    public BoardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BoardSummaryDto>> GetBoardsAsync(int userId)
    {
        var boards = await _db.Boards
            .AsNoTracking()
            .Include(b => b.Members)
            .Where(b => b.Members.Any(m => m.UserId == userId))
            .OrderByDescending(b => b.UpdatedAt ?? b.CreatedAt)
            .ToListAsync();

        return boards.Select(b => b.ToSummaryDto()).ToList();
    }

    public async Task<BoardDetailDto> GetBoardAsync(int userId, int boardId)
    {
        await BoardAccess.EnsureCanViewBoardAsync(_db, boardId, userId);
        var board = await LoadBoardAsync(boardId);
        return board.ToDetailDto();
    }

    public async Task<BoardDetailDto> CreateBoardAsync(int userId, CreateBoardRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("Tên bảng là bắt buộc.");
        }

        var board = new Board
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            OwnerId = userId,
            IsPublic = request.IsPublic
        };

        board.Members.Add(new BoardMember { UserId = userId, Role = BoardRole.Owner });
        board.Columns.Add(new BoardColumn { Name = "Cần làm", Position = 1 });
        board.Columns.Add(new BoardColumn { Name = "Đang làm", Position = 2 });
        board.Columns.Add(new BoardColumn { Name = "Hoàn thành", Position = 3 });

        _db.Boards.Add(board);
        await _db.SaveChangesAsync();

        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = board.Id,
            UserId = userId,
            Action = "CreateBoard",
            Description = $"Tạo bảng {board.Name}"
        });
        await _db.SaveChangesAsync();

        return (await LoadBoardAsync(board.Id)).ToDetailDto();
    }

    public async Task<BoardDetailDto> UpdateBoardAsync(int userId, int boardId, UpdateBoardRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        var board = await _db.Boards.FindAsync(boardId) ?? throw new KeyNotFoundException("Không tìm thấy bảng.");

        board.Name = request.Name.Trim();
        board.Description = request.Description;
        board.IsPublic = request.IsPublic;
        board.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (await LoadBoardAsync(boardId)).ToDetailDto();
    }

    public async Task DeleteBoardAsync(int userId, int boardId)
    {
        await BoardAccess.EnsureOwnerAsync(_db, boardId, userId);
        var board = await _db.Boards.FindAsync(boardId) ?? throw new KeyNotFoundException("Không tìm thấy bảng.");
        _db.Boards.Remove(board);
        await _db.SaveChangesAsync();
    }

    private async Task<Board> LoadBoardAsync(int boardId)
    {
        return await _db.Boards
            .AsNoTracking()
            .Include(b => b.Members).ThenInclude(m => m.User)
            .Include(b => b.Columns).ThenInclude(c => c.Cards).ThenInclude(c => c.Assignee)
            .Include(b => b.Columns).ThenInclude(c => c.Cards).ThenInclude(c => c.Labels)
            .FirstOrDefaultAsync(b => b.Id == boardId)
            ?? throw new KeyNotFoundException("Không tìm thấy bảng.");
    }
}
