using Kanban.API.Data;
using Kanban.API.DTOs.Board;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Kanban.API.Common;
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
        var isSystemAdmin = await BoardAccess.IsSystemAdminAsync(_db, userId);
        var query = _db.Boards
            .AsNoTracking()
            .Include(b => b.OrganizationUnit)
            .Include(b => b.Members)
            .Include(b => b.Documents)
            .Include(b => b.Columns).ThenInclude(c => c.Cards)
            .AsQueryable();

        if (!isSystemAdmin)
        {
            query = query.Where(b => b.Members.Any(m => m.UserId == userId));
        }

        var boards = await query
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
        if (!await BoardAccess.IsSystemAdminAsync(_db, userId))
        {
            throw new ForbiddenException("Chỉ Admin hệ thống được tạo dự án mới.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("Tên dự án là bắt buộc.");
        }

        var board = new Board
        {
            ProjectCode = NormalizeProjectCode(request.ProjectCode),
            Name = request.Name.Trim(),
            Description = Normalize(request.Description),
            Summary = Normalize(request.Summary),
            OwnerId = userId,
            OrganizationUnitId = request.OrganizationUnitId,
            IsPublic = request.IsPublic
        };

        board.Members.Add(new BoardMember { UserId = userId, Role = BoardRole.Owner });
        if (request.OrganizationUnitId is not null)
        {
            await EnsureOrganizationUnitExistsAsync(request.OrganizationUnitId.Value);
            var unitMembers = await GetOrganizationUnitUsersAsync(request.OrganizationUnitId.Value);
            foreach (var unitMember in unitMembers.Where(member => member.UserId != userId))
            {
                board.Members.Add(new BoardMember
                {
                    UserId = unitMember.UserId,
                    Role = unitMember.IsLead ? BoardRole.Admin : BoardRole.Member
                });
            }
        }

        board.Columns.Add(new BoardColumn { Name = "Cần làm", Position = 1, IsDone = false });
        board.Columns.Add(new BoardColumn { Name = "Đang làm", Position = 2, IsDone = false });
        board.Columns.Add(new BoardColumn { Name = "Done", Position = 3, IsDone = true });

        _db.Boards.Add(board);
        await _db.SaveChangesAsync();

        foreach (var member in board.Members.Where(member => member.UserId != userId))
        {
            _db.Notifications.Add(new Notification
            {
                UserId = member.UserId,
                Title = "Bạn được thêm vào dự án",
                Message = $"Bạn vừa được thêm vào dự án {board.Name}.",
                Type = "BoardInvite",
                BoardId = board.Id
            });
        }

        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = board.Id,
            UserId = userId,
            Action = "CreateBoard",
            Description = $"Tạo dự án {board.Name}"
        });
        await _db.SaveChangesAsync();

        return (await LoadBoardAsync(board.Id)).ToDetailDto();
    }

    public async Task<BoardDetailDto> UpdateBoardAsync(int userId, int boardId, UpdateBoardRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        var board = await _db.Boards.FindAsync(boardId) ?? throw new KeyNotFoundException("Không tìm thấy dự án.");

        board.ProjectCode = NormalizeProjectCode(request.ProjectCode);
        board.Name = request.Name.Trim();
        board.Description = Normalize(request.Description);
        board.Summary = Normalize(request.Summary);
        board.OrganizationUnitId = request.OrganizationUnitId;
        board.IsPublic = request.IsPublic;
        board.UpdatedAt = DateTime.UtcNow;
        if (request.OrganizationUnitId is not null)
        {
            await EnsureOrganizationUnitExistsAsync(request.OrganizationUnitId.Value);
            await AddMissingOrganizationMembersToBoardAsync(boardId, request.OrganizationUnitId.Value, userId);
        }

        await _db.SaveChangesAsync();

        return (await LoadBoardAsync(boardId)).ToDetailDto();
    }

    public async Task<ProjectDocumentDto> AddProjectDocumentAsync(int userId, int boardId, CreateProjectDocumentRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        if (!Uri.TryCreate(request.Url.Trim(), UriKind.Absolute, out _))
        {
            throw new InvalidOperationException("Liên kết tài liệu không hợp lệ.");
        }

        if (!await _db.Boards.AnyAsync(b => b.Id == boardId))
        {
            throw new KeyNotFoundException("Không tìm thấy dự án.");
        }

        var document = new ProjectDocument
        {
            BoardId = boardId,
            Title = request.Title.Trim(),
            Description = Normalize(request.Description),
            Url = request.Url.Trim()
        };

        _db.ProjectDocuments.Add(document);
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "AddProjectDocument",
            Description = $"Thêm tài liệu dự án {document.Title}"
        });
        await _db.SaveChangesAsync();

        return document.ToDto();
    }

    public async Task DeleteProjectDocumentAsync(int userId, int boardId, int documentId)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        var document = await _db.ProjectDocuments
            .FirstOrDefaultAsync(d => d.BoardId == boardId && d.Id == documentId)
            ?? throw new KeyNotFoundException("Không tìm thấy tài liệu dự án.");

        _db.ProjectDocuments.Remove(document);
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "DeleteProjectDocument",
            Description = $"Xóa tài liệu dự án {document.Title}"
        });
        await _db.SaveChangesAsync();
    }

    public async Task DeleteBoardAsync(int userId, int boardId)
    {
        await BoardAccess.EnsureOwnerAsync(_db, boardId, userId);
        var board = await _db.Boards.FindAsync(boardId) ?? throw new KeyNotFoundException("Không tìm thấy dự án.");
        _db.Boards.Remove(board);
        await _db.SaveChangesAsync();
    }

    private async Task<Board> LoadBoardAsync(int boardId)
    {
        return await _db.Boards
            .AsNoTracking()
            .Include(b => b.OrganizationUnit)
            .Include(b => b.Members).ThenInclude(m => m.User)
            .Include(b => b.Documents)
            .Include(b => b.Columns).ThenInclude(c => c.Cards).ThenInclude(c => c.Assignee)
            .Include(b => b.Columns).ThenInclude(c => c.Cards).ThenInclude(c => c.Labels)
            .FirstOrDefaultAsync(b => b.Id == boardId)
            ?? throw new KeyNotFoundException("Không tìm thấy dự án.");
    }

    private async Task EnsureOrganizationUnitExistsAsync(int organizationUnitId)
    {
        if (!await _db.OrganizationUnits.AnyAsync(unit => unit.Id == organizationUnitId && unit.IsActive))
        {
            throw new KeyNotFoundException("Không tìm thấy phòng ban hoặc team đang hoạt động.");
        }
    }

    private async Task AddMissingOrganizationMembersToBoardAsync(int boardId, int organizationUnitId, int actorId)
    {
        var existingUserIds = await _db.BoardMembers
            .Where(member => member.BoardId == boardId)
            .Select(member => member.UserId)
            .ToListAsync();
        var existing = existingUserIds.ToHashSet();
        var unitMembers = await GetOrganizationUnitUsersAsync(organizationUnitId);
        var added = new List<int>();

        foreach (var unitMember in unitMembers.Where(member => !existing.Contains(member.UserId)))
        {
            _db.BoardMembers.Add(new BoardMember
            {
                BoardId = boardId,
                UserId = unitMember.UserId,
                Role = unitMember.IsLead ? BoardRole.Admin : BoardRole.Member
            });
            _db.Notifications.Add(new Notification
            {
                UserId = unitMember.UserId,
                Title = "Bạn được thêm vào dự án",
                Message = "Bạn vừa được thêm vào dự án theo phòng ban hoặc team phụ trách.",
                Type = "BoardInvite",
                BoardId = boardId
            });
            added.Add(unitMember.UserId);
        }

        if (added.Count > 0)
        {
            _db.ActivityLogs.Add(new ActivityLog
            {
                BoardId = boardId,
                UserId = actorId,
                Action = "SyncOrganizationUnit",
                Description = $"Thêm {added.Count} thành viên từ phòng ban/team vào dự án"
            });
        }
    }

    private async Task<List<UnitUser>> GetOrganizationUnitUsersAsync(int organizationUnitId)
    {
        var units = await _db.OrganizationUnits
            .AsNoTracking()
            .Where(unit => unit.IsActive)
            .Select(unit => new UnitNode(unit.Id, unit.ParentId, unit.ManagerId))
            .ToListAsync();
        var unitIds = CollectUnitAndChildren(organizationUnitId, units).ToHashSet();

        var members = await _db.OrganizationUnitMembers
            .AsNoTracking()
            .Include(member => member.User)
            .Where(member => unitIds.Contains(member.OrganizationUnitId) && member.User.IsActive)
            .Select(member => new
            {
                member.UserId,
                IsLead = member.Role == OrganizationUnitMemberRole.Lead
            })
            .ToListAsync();

        var result = members
            .GroupBy(member => member.UserId)
            .ToDictionary(group => group.Key, group => group.Any(member => member.IsLead));

        var managerIds = units
            .Where(unit => unitIds.Contains(unit.Id) && unit.ManagerId is not null)
            .Select(unit => unit.ManagerId!.Value)
            .ToList();
        var activeManagerIds = await _db.Users
            .AsNoTracking()
            .Where(user => managerIds.Contains(user.Id) && user.IsActive)
            .Select(user => user.Id)
            .ToListAsync();

        foreach (var managerId in activeManagerIds)
        {
            result[managerId] = true;
        }

        return result.Select(item => new UnitUser(item.Key, item.Value)).ToList();
    }

    private static IEnumerable<int> CollectUnitAndChildren(int rootUnitId, IEnumerable<UnitNode> units)
    {
        var unitList = units.ToList();
        var queue = new Queue<int>();
        queue.Enqueue(rootUnitId);

        while (queue.Count > 0)
        {
            var currentId = queue.Dequeue();
            yield return currentId;

            foreach (var child in unitList.Where(unit => unit.ParentId == currentId))
            {
                queue.Enqueue(child.Id);
            }
        }
    }

    private sealed record UnitNode(int Id, int? ParentId, int? ManagerId);

    private sealed record UnitUser(int UserId, bool IsLead);

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeProjectCode(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
    }
}
