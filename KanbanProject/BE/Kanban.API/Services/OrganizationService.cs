using Kanban.API.Common;
using Kanban.API.Data;
using Kanban.API.DTOs.Organization;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class OrganizationService : IOrganizationService
{
    private readonly AppDbContext _db;

    public OrganizationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<OrganizationUnitDto>> GetUnitsAsync(int currentUserId, bool includeInactive)
    {
        await EnsureActiveUserAsync(currentUserId);
        var query = UnitQuery();

        if (!includeInactive)
        {
            query = query.Where(unit => unit.IsActive);
        }

        var units = await query
            .OrderBy(unit => unit.Type)
            .ThenBy(unit => unit.Parent!.Name)
            .ThenBy(unit => unit.Name)
            .ToListAsync();

        return units.Select(ToDto).ToList();
    }

    public async Task<List<OrganizationUnitOptionDto>> GetUnitOptionsAsync(int currentUserId, bool includeInactive)
    {
        await EnsureActiveUserAsync(currentUserId);
        var query = _db.OrganizationUnits
            .AsNoTracking()
            .Include(unit => unit.Parent)
            .Include(unit => unit.Manager)
            .Include(unit => unit.Members)
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(unit => unit.IsActive);
        }

        var units = await query
            .OrderBy(unit => unit.Type)
            .ThenBy(unit => unit.Parent!.Name)
            .ThenBy(unit => unit.Name)
            .ToListAsync();

        return units.Select(unit => new OrganizationUnitOptionDto(
            unit.Id,
            unit.Code,
            unit.Name,
            unit.Type,
            unit.ParentId,
            unit.Parent?.Name,
            unit.ManagerId,
            unit.Manager?.FullName,
            unit.Members.Count)).ToList();
    }

    public async Task<OrganizationUnitDto> CreateUnitAsync(int currentUserId, SaveOrganizationUnitRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var code = NormalizeCode(request.Code);
        await EnsureUniqueCodeAsync(code);
        await ValidateParentAsync(request.Type, request.ParentId);
        await ValidateManagerAsync(request.ManagerId);

        var unit = new OrganizationUnit
        {
            Code = code,
            Name = request.Name.Trim(),
            Description = Normalize(request.Description),
            Type = request.Type,
            ParentId = request.ParentId,
            ManagerId = request.ManagerId,
            IsActive = request.IsActive
        };

        _db.OrganizationUnits.Add(unit);
        await _db.SaveChangesAsync();

        if (unit.ManagerId is not null)
        {
            await EnsureUnitMemberAsync(unit.Id, unit.ManagerId.Value, OrganizationUnitMemberRole.Lead);
        }

        return await GetUnitDtoAsync(unit.Id);
    }

    public async Task<OrganizationUnitDto> UpdateUnitAsync(int currentUserId, int unitId, SaveOrganizationUnitRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var unit = await _db.OrganizationUnits
            .Include(item => item.Members)
            .FirstOrDefaultAsync(item => item.Id == unitId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng ban hoặc team.");

        var code = NormalizeCode(request.Code);
        await EnsureUniqueCodeAsync(code, unitId);
        await ValidateParentAsync(request.Type, request.ParentId, unitId);
        await ValidateManagerAsync(request.ManagerId);

        unit.Code = code;
        unit.Name = request.Name.Trim();
        unit.Description = Normalize(request.Description);
        unit.Type = request.Type;
        unit.ParentId = request.ParentId;
        unit.ManagerId = request.ManagerId;
        unit.IsActive = request.IsActive;
        unit.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (unit.ManagerId is not null)
        {
            await EnsureUnitMemberAsync(unit.Id, unit.ManagerId.Value, OrganizationUnitMemberRole.Lead);
        }

        await SyncPrimaryUnitNamesAsync(unit.Id);
        return await GetUnitDtoAsync(unit.Id);
    }

    public async Task<OrganizationUnitDto> AddMemberAsync(int currentUserId, int unitId, AddOrganizationUnitMemberRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var unit = await _db.OrganizationUnits.FirstOrDefaultAsync(item => item.Id == unitId && item.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng ban hoặc team đang hoạt động.");
        var user = await _db.Users.FirstOrDefaultAsync(item => item.Id == request.UserId && item.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng đang hoạt động.");

        if (await _db.OrganizationUnitMembers.AnyAsync(member => member.OrganizationUnitId == unitId && member.UserId == user.Id))
        {
            throw new InvalidOperationException("Người dùng đã thuộc đơn vị này.");
        }

        _db.OrganizationUnitMembers.Add(new OrganizationUnitMember
        {
            OrganizationUnitId = unitId,
            UserId = user.Id,
            Role = request.Role
        });

        if (request.Role == OrganizationUnitMemberRole.Lead && unit.ManagerId is null)
        {
            unit.ManagerId = user.Id;
        }

        AssignPrimaryUnit(user, unit);
        await _db.SaveChangesAsync();
        return await GetUnitDtoAsync(unitId);
    }

    public async Task<OrganizationUnitDto> UpdateMemberRoleAsync(int currentUserId, int unitId, int memberId, UpdateOrganizationUnitMemberRequest request)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var member = await _db.OrganizationUnitMembers
            .Include(item => item.OrganizationUnit)
            .FirstOrDefaultAsync(item => item.Id == memberId && item.OrganizationUnitId == unitId)
            ?? throw new KeyNotFoundException("Không tìm thấy thành viên trong đơn vị.");

        member.Role = request.Role;
        if (request.Role == OrganizationUnitMemberRole.Lead && member.OrganizationUnit.ManagerId is null)
        {
            member.OrganizationUnit.ManagerId = member.UserId;
        }

        await _db.SaveChangesAsync();
        return await GetUnitDtoAsync(unitId);
    }

    public async Task<OrganizationUnitDto> RemoveMemberAsync(int currentUserId, int unitId, int memberId)
    {
        await EnsureSystemAdminAsync(currentUserId);
        var member = await _db.OrganizationUnitMembers
            .Include(item => item.OrganizationUnit)
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == memberId && item.OrganizationUnitId == unitId)
            ?? throw new KeyNotFoundException("Không tìm thấy thành viên trong đơn vị.");

        if (member.OrganizationUnit.ManagerId == member.UserId)
        {
            member.OrganizationUnit.ManagerId = null;
        }

        if (member.User.OrganizationUnitId == unitId)
        {
            member.User.OrganizationUnitId = null;
            member.User.Department = null;
            member.User.UpdatedAt = DateTime.UtcNow;
        }

        _db.OrganizationUnitMembers.Remove(member);
        await _db.SaveChangesAsync();
        return await GetUnitDtoAsync(unitId);
    }

    private IQueryable<OrganizationUnit> UnitQuery()
    {
        return _db.OrganizationUnits
            .AsNoTracking()
            .Include(unit => unit.Parent)
            .Include(unit => unit.Manager)
            .Include(unit => unit.Boards)
            .Include(unit => unit.Members).ThenInclude(member => member.User);
    }

    private async Task<OrganizationUnitDto> GetUnitDtoAsync(int unitId)
    {
        var unit = await UnitQuery()
            .FirstOrDefaultAsync(item => item.Id == unitId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng ban hoặc team.");

        return ToDto(unit);
    }

    private static OrganizationUnitDto ToDto(OrganizationUnit unit)
    {
        var members = unit.Members
            .OrderByDescending(member => member.Role)
            .ThenBy(member => member.User.FullName)
            .Select(member => new OrganizationUnitMemberDto(
                member.Id,
                member.UserId,
                member.User.FullName,
                member.User.UserName,
                member.User.Email,
                member.User.AvatarUrl,
                member.User.JobTitle,
                member.Role,
                member.JoinedAt))
            .ToList();

        return new OrganizationUnitDto(
            unit.Id,
            unit.Code,
            unit.Name,
            unit.Description,
            unit.Type,
            unit.ParentId,
            unit.Parent?.Name,
            unit.ManagerId,
            unit.Manager?.FullName,
            unit.IsActive,
            members.Count,
            unit.Boards.Count,
            unit.CreatedAt,
            unit.UpdatedAt,
            members);
    }

    private async Task EnsureSystemAdminAsync(int userId)
    {
        if (!await BoardAccess.IsSystemAdminAsync(_db, userId))
        {
            throw new ForbiddenException("Bạn cần quyền quản trị hệ thống.");
        }
    }

    private async Task EnsureActiveUserAsync(int userId)
    {
        if (!await _db.Users.AnyAsync(user => user.Id == userId && user.IsActive))
        {
            throw new ForbiddenException("Tài khoản không còn hoạt động.");
        }
    }

    private async Task EnsureUniqueCodeAsync(string code, int? exceptUnitId = null)
    {
        if (await _db.OrganizationUnits.AnyAsync(unit => unit.Code == code && unit.Id != exceptUnitId))
        {
            throw new InvalidOperationException("Mã phòng ban hoặc team đã được sử dụng.");
        }
    }

    private async Task ValidateParentAsync(OrganizationUnitType type, int? parentId, int? currentUnitId = null)
    {
        if (type == OrganizationUnitType.Team && parentId is null)
        {
            throw new InvalidOperationException("Team phải thuộc một phòng ban.");
        }

        if (parentId is null)
        {
            return;
        }

        if (parentId == currentUnitId)
        {
            throw new InvalidOperationException("Đơn vị không thể tự thuộc chính nó.");
        }

        var parent = await _db.OrganizationUnits.AsNoTracking().FirstOrDefaultAsync(unit => unit.Id == parentId && unit.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng ban cha.");

        if (parent.Type != OrganizationUnitType.Department)
        {
            throw new InvalidOperationException("Team chỉ được thuộc một phòng ban.");
        }
    }

    private async Task ValidateManagerAsync(int? managerId)
    {
        if (managerId is null)
        {
            return;
        }

        if (!await _db.Users.AnyAsync(user => user.Id == managerId && user.IsActive))
        {
            throw new KeyNotFoundException("Không tìm thấy quản lý đang hoạt động.");
        }
    }

    private async Task EnsureUnitMemberAsync(int unitId, int userId, OrganizationUnitMemberRole role)
    {
        var member = await _db.OrganizationUnitMembers
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.OrganizationUnitId == unitId && item.UserId == userId);
        var unit = await _db.OrganizationUnits.FirstAsync(item => item.Id == unitId);
        var user = await _db.Users.FirstAsync(item => item.Id == userId);

        if (member is null)
        {
            _db.OrganizationUnitMembers.Add(new OrganizationUnitMember
            {
                OrganizationUnitId = unitId,
                UserId = userId,
                Role = role
            });
        }
        else if (member.Role != role)
        {
            member.Role = role;
        }

        AssignPrimaryUnit(user, unit);
        await _db.SaveChangesAsync();
    }

    private async Task SyncPrimaryUnitNamesAsync(int unitId)
    {
        var unit = await _db.OrganizationUnits.FindAsync(unitId);
        if (unit is null)
        {
            return;
        }

        var users = await _db.Users.Where(user => user.OrganizationUnitId == unitId).ToListAsync();
        foreach (var user in users)
        {
            user.Department = unit.Name;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private static void AssignPrimaryUnit(User user, OrganizationUnit unit)
    {
        if (user.OrganizationUnitId is not null && user.OrganizationUnitId != unit.Id)
        {
            return;
        }

        user.OrganizationUnitId = unit.Id;
        user.Department = unit.Name;
        user.UpdatedAt = DateTime.UtcNow;
    }

    private static string NormalizeCode(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
