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
        await BoardAccess.EnsureMemberAsync(_db, boardId, userId);
        var members = await _db.BoardMembers
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.BoardId == boardId)
            .OrderBy(m => m.Role)
            .ThenBy(m => m.User.FullName)
            .ToListAsync();

        return members.Select(m => m.ToDto()).ToList();
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
            throw new InvalidOperationException("Người dùng đã là thành viên của bảng.");
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
            Title = "Bạn được mời vào bảng",
            Message = "Bạn vừa được thêm vào một bảng Kanban.",
            Type = "BoardInvite"
        });
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "AddMember",
            Description = $"Thêm {user.Email} vào bảng"
        });
        await _db.SaveChangesAsync();

        return (await _db.BoardMembers.AsNoTracking().Include(m => m.User).FirstAsync(m => m.Id == member.Id)).ToDto();
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
}
