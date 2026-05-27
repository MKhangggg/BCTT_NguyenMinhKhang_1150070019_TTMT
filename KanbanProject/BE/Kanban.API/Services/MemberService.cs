using Kanban.API.Data;
using Kanban.API.DTOs.Member;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class MemberService : IMemberService
{
    private readonly AppDbContext _db;

    public MemberService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BoardMemberDto>> GetMembersAsync(int userId, int boardId)
    {
        await BoardAccess.EnsureCanViewBoardAsync(_db, boardId, userId);
        var members = await _db.BoardMembers
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.BoardId == boardId)
            .OrderBy(m => m.Role)
            .ThenBy(m => m.User.FullName)
            .ToListAsync();

        return members.Select(m => m.ToDto()).ToList();
    }

    public async Task<List<MemberCandidateDto>> GetMemberCandidatesAsync(int userId, int boardId, string? search)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        var existingUserIds = await _db.BoardMembers
            .Where(member => member.BoardId == boardId)
            .Select(member => member.UserId)
            .ToListAsync();
        var keyword = search?.Trim().ToLowerInvariant();

        var query = _db.Users
            .AsNoTracking()
            .Where(user => user.IsActive && !existingUserIds.Contains(user.Id));

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(user =>
                user.FullName.ToLower().Contains(keyword)
                || user.UserName.ToLower().Contains(keyword)
                || user.Email.ToLower().Contains(keyword)
                || (user.Department != null && user.Department.ToLower().Contains(keyword))
                || (user.JobTitle != null && user.JobTitle.ToLower().Contains(keyword)));
        }

        return await query
            .OrderBy(user => user.FullName)
            .Take(200)
            .Select(user => new MemberCandidateDto(
                user.Id,
                user.FullName,
                user.UserName,
                user.Email,
                user.AvatarUrl,
                user.Department,
                user.JobTitle))
            .ToListAsync();
    }

    public async Task<BoardMemberDto> AddMemberAsync(int userId, int boardId, AddMemberRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        if (request.Role == BoardRole.Owner)
        {
            throw new InvalidOperationException("Không thể thêm chủ sở hữu bằng API mời thành viên.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng với email này.");

        if (await _db.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.UserId == user.Id))
        {
            throw new InvalidOperationException("Người dùng đã là thành viên của dự án.");
        }

        var member = new BoardMember
        {
            BoardId = boardId,
            UserId = user.Id,
            Role = request.Role
        };

        _db.BoardMembers.Add(member);
        _db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Title = "Bạn được thêm vào dự án",
            Message = "Bạn vừa được thêm vào một dự án Kanban.",
            Type = "BoardInvite",
            BoardId = boardId
        });
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "AddMember",
            Description = $"Thêm {user.Email} vào dự án"
        });
        await _db.SaveChangesAsync();

        return (await _db.BoardMembers.AsNoTracking().Include(m => m.User).FirstAsync(m => m.Id == member.Id)).ToDto();
    }

    public async Task<List<BoardMemberDto>> AddOrganizationUnitMembersAsync(int userId, int boardId, AddOrganizationUnitMembersRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        if (request.Role == BoardRole.Owner)
        {
            throw new InvalidOperationException("Không thể thêm cả team bằng vai trò chủ sở hữu.");
        }

        var unit = await _db.OrganizationUnits
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.OrganizationUnitId && item.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng ban hoặc team đang hoạt động.");
        var existingUserIds = await _db.BoardMembers
            .Where(member => member.BoardId == boardId)
            .Select(member => member.UserId)
            .ToListAsync();
        var existing = existingUserIds.ToHashSet();
        var unitMembers = await GetOrganizationUnitUsersAsync(request.OrganizationUnitId);
        var addedCount = 0;

        foreach (var unitMember in unitMembers.Where(member => !existing.Contains(member.UserId)))
        {
            _db.BoardMembers.Add(new BoardMember
            {
                BoardId = boardId,
                UserId = unitMember.UserId,
                Role = request.PromoteLeadsToAdmin && unitMember.IsLead ? BoardRole.Admin : request.Role
            });
            _db.Notifications.Add(new Notification
            {
                UserId = unitMember.UserId,
                Title = "Bạn được thêm vào dự án",
                Message = $"Bạn vừa được thêm vào dự án theo {unit.Name}.",
                Type = "BoardInvite",
                BoardId = boardId
            });
            addedCount++;
        }

        if (addedCount == 0)
        {
            throw new InvalidOperationException("Các thành viên của phòng ban/team này đã có trong dự án.");
        }

        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "AddOrganizationUnitMembers",
            Description = $"Thêm {addedCount} thành viên từ {unit.Name}"
        });
        await _db.SaveChangesAsync();

        return await GetMembersAsync(userId, boardId);
    }

    public async Task<BoardMemberDto> UpdateRoleAsync(int userId, int boardId, int memberId, UpdateMemberRoleRequest request)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        if (request.Role == BoardRole.Owner)
        {
            throw new InvalidOperationException("Không thể chuyển vai trò thành chủ sở hữu bằng API này.");
        }

        var member = await _db.BoardMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.BoardId == boardId && m.Id == memberId)
            ?? throw new KeyNotFoundException("Không tìm thấy thành viên.");

        if (member.Role == BoardRole.Owner)
        {
            throw new InvalidOperationException("Không thể đổi vai trò của chủ sở hữu.");
        }

        member.Role = request.Role;
        await _db.SaveChangesAsync();
        return member.ToDto();
    }

    public async Task RemoveMemberAsync(int userId, int boardId, int memberId)
    {
        await BoardAccess.EnsureCanManageBoardAsync(_db, boardId, userId);
        var member = await _db.BoardMembers
            .FirstOrDefaultAsync(m => m.BoardId == boardId && m.Id == memberId)
            ?? throw new KeyNotFoundException("Không tìm thấy thành viên.");

        if (member.Role == BoardRole.Owner)
        {
            throw new InvalidOperationException("Không thể xóa chủ sở hữu khỏi bảng.");
        }

        _db.BoardMembers.Remove(member);
        await _db.SaveChangesAsync();
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
}
