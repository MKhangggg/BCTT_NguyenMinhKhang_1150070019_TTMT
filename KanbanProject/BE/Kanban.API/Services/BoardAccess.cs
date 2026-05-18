using Kanban.API.Common;
using Kanban.API.Data;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

internal static class BoardAccess
{
    public static async Task EnsureCanViewBoardAsync(AppDbContext db, int boardId, int userId)
    {
        if (await IsSystemAdminAsync(db, userId))
        {
            return;
        }

        await EnsureMemberAsync(db, boardId, userId);
    }

    public static async Task<BoardRole> EnsureMemberAsync(AppDbContext db, int boardId, int userId)
    {
        var role = await db.BoardMembers
            .Where(m => m.BoardId == boardId && m.UserId == userId)
            .Select(m => (BoardRole?)m.Role)
            .FirstOrDefaultAsync();

        if (role is null)
        {
            throw new ForbiddenException("Bạn không thuộc bảng này.");
        }

        return role.Value;
    }

    private static async Task<bool> IsSystemAdminAsync(AppDbContext db, int userId)
    {
        return await db.Users.AnyAsync(u => u.Id == userId && u.IsActive && u.IsSystemAdmin);
    }

    public static async Task EnsureCanManageBoardAsync(AppDbContext db, int boardId, int userId)
    {
        var role = await EnsureMemberAsync(db, boardId, userId);
        if (role is not (BoardRole.Owner or BoardRole.Admin))
        {
            throw new ForbiddenException("Bạn không có quyền quản lý bảng này.");
        }
    }

    public static async Task EnsureCanEditCardsAsync(AppDbContext db, int boardId, int userId)
    {
        var role = await EnsureMemberAsync(db, boardId, userId);
        if (role == BoardRole.Viewer)
        {
            throw new ForbiddenException("Người xem chỉ có quyền xem.");
        }
    }

    public static async Task EnsureOwnerAsync(AppDbContext db, int boardId, int userId)
    {
        var role = await EnsureMemberAsync(db, boardId, userId);
        if (role != BoardRole.Owner)
        {
            throw new ForbiddenException("Chỉ chủ sở hữu được thực hiện thao tác này.");
        }
    }

    public static async Task EnsureAssigneeInBoardAsync(AppDbContext db, int boardId, int? assigneeId)
    {
        if (assigneeId is null)
        {
            return;
        }

        var exists = await db.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.UserId == assigneeId);
        if (!exists)
        {
            throw new InvalidOperationException("Người phụ trách phải là thành viên của bảng.");
        }
    }
}
