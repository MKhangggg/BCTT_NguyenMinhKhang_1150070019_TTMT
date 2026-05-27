using Kanban.API.Helpers;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        var existingAdmin = await db.Users.FirstOrDefaultAsync(u => u.Email == "admin@kanban.com");
        if (existingAdmin is not null)
        {
            existingAdmin.IsSystemAdmin = true;
            existingAdmin.IsActive = true;
            existingAdmin.Department ??= "Vận hành";
            existingAdmin.JobTitle ??= "Quản trị hệ thống";
            await db.SaveChangesAsync();
            await EnsureDudiStructureAsync(db, existingAdmin);
        }

        if (await db.Users.AnyAsync())
        {
            return;
        }

        var admin = new User
        {
            FullName = "Quản trị Kanban",
            UserName = "admin",
            Email = "admin@kanban.com",
            PasswordHash = PasswordHelper.HashPassword("Admin@123"),
            Department = "Vận hành",
            JobTitle = "Quản trị hệ thống",
            IsSystemAdmin = true
        };

        var board = new Board
        {
            Name = "Dự án Website Kanban",
            Description = "Bảng mẫu để kiểm thử kéo thả, checklist, bình luận và báo cáo.",
            Owner = admin,
            IsPublic = false
        };

        board.Members.Add(new BoardMember
        {
            User = admin,
            Role = BoardRole.Owner
        });

        var todo = new BoardColumn { Board = board, Name = "Cần làm", Position = 1, WipLimit = 5, IsDone = false };
        var inProgress = new BoardColumn { Board = board, Name = "Đang làm", Position = 2, WipLimit = 3, IsDone = false };
        var done = new BoardColumn { Board = board, Name = "Done", Position = 3, IsDone = true };

        var card1 = new Card
        {
            Board = board,
            Column = todo,
            Title = "Thiết kế giao diện tổng quan",
            Description = "Tạo bố cục thanh bên, thanh tiêu đề và danh sách bảng.",
            Priority = CardPriority.High,
            DueDate = DateTime.UtcNow.AddDays(3),
            Position = 1,
            CreatedBy = admin,
            Assignee = admin
        };
        card1.Labels.Add(new CardLabel { Name = "Giao diện", Color = "#2563eb" });
        card1.ChecklistItems.Add(new ChecklistItem { Content = "Tạo route tổng quan", Position = 1 });
        card1.ChecklistItems.Add(new ChecklistItem { Content = "Hiển thị các bảng", Position = 2 });

        var card2 = new Card
        {
            Board = board,
            Column = inProgress,
            Title = "Xây dựng API tạo thẻ",
            Description = "Tạo controller và service cho thao tác CRUD thẻ.",
            Priority = CardPriority.Medium,
            DueDate = DateTime.UtcNow.AddDays(5),
            Position = 1,
            CreatedBy = admin,
            Assignee = admin
        };
        card2.Labels.Add(new CardLabel { Name = "API", Color = "#16a34a" });

        var card3 = new Card
        {
            Board = board,
            Column = done,
            Title = "Khởi tạo database Code First",
            Description = "Tạo model, DbContext và migration đầu tiên.",
            Priority = CardPriority.Low,
            CompletedAt = DateTime.UtcNow,
            Position = 1,
            CreatedBy = admin,
            Assignee = admin
        };
        card3.Labels.Add(new CardLabel { Name = "Cơ sở dữ liệu", Color = "#f97316" });
        card3.ChecklistItems.Add(new ChecklistItem { Content = "Tạo AppDbContext", IsCompleted = true, Position = 1 });

        board.Columns.Add(todo);
        board.Columns.Add(inProgress);
        board.Columns.Add(done);
        board.Cards.Add(card1);
        board.Cards.Add(card2);
        board.Cards.Add(card3);
        board.ActivityLogs.Add(new ActivityLog
        {
            User = admin,
            Action = "Seed",
            Description = "Tạo dữ liệu mẫu ban đầu"
        });

        db.Boards.Add(board);
        await db.SaveChangesAsync();
        await EnsureDudiStructureAsync(db, admin);
    }

    private static async Task EnsureDudiStructureAsync(AppDbContext db, User admin)
    {
        var operations = await EnsureUnitAsync(db, "DUDI-OPS", "Ban vận hành DUDI", OrganizationUnitType.Department, null, admin.Id, "Quản trị vận hành nội bộ.");
        var product = await EnsureUnitAsync(db, "DUDI-PROD", "Phòng sản phẩm & kỹ thuật", OrganizationUnitType.Department, null, admin.Id, "Phát triển sản phẩm, nền tảng và hệ thống nội bộ.");
        await EnsureUnitAsync(db, "DUDI-FE", "Team Frontend", OrganizationUnitType.Team, product.Id, admin.Id, "Xây dựng giao diện và trải nghiệm người dùng.");
        await EnsureUnitAsync(db, "DUDI-BE", "Team Backend", OrganizationUnitType.Team, product.Id, admin.Id, "Xây dựng API, dữ liệu và tích hợp hệ thống.");
        await EnsureUnitAsync(db, "DUDI-QA", "Team QA", OrganizationUnitType.Team, product.Id, admin.Id, "Kiểm thử, nghiệm thu và đảm bảo chất lượng.");

        if (!await db.OrganizationUnitMembers.AnyAsync(member => member.OrganizationUnitId == operations.Id && member.UserId == admin.Id))
        {
            db.OrganizationUnitMembers.Add(new OrganizationUnitMember
            {
                OrganizationUnitId = operations.Id,
                UserId = admin.Id,
                Role = OrganizationUnitMemberRole.Lead
            });
        }

        admin.OrganizationUnitId ??= operations.Id;
        admin.Department = operations.Name;
        await db.SaveChangesAsync();
    }

    private static async Task<OrganizationUnit> EnsureUnitAsync(
        AppDbContext db,
        string code,
        string name,
        OrganizationUnitType type,
        int? parentId,
        int? managerId,
        string description)
    {
        var unit = await db.OrganizationUnits.FirstOrDefaultAsync(item => item.Code == code);
        if (unit is not null)
        {
            unit.Name = name;
            unit.Description = description;
            unit.Type = type;
            unit.ParentId = parentId;
            unit.ManagerId ??= managerId;
            unit.IsActive = true;
            return unit;
        }

        unit = new OrganizationUnit
        {
            Code = code,
            Name = name,
            Description = description,
            Type = type,
            ParentId = parentId,
            ManagerId = managerId,
            IsActive = true
        };
        db.OrganizationUnits.Add(unit);
        await db.SaveChangesAsync();
        return unit;
    }
}
