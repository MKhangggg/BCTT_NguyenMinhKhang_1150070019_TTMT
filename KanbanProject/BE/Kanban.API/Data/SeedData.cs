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
            existingAdmin.Department ??= "Operations";
            existingAdmin.JobTitle ??= "System Administrator";
            await db.SaveChangesAsync();
        }

        if (await db.Users.AnyAsync())
        {
            return;
        }

        var admin = new User
        {
            FullName = "Kanban Admin",
            UserName = "admin",
            Email = "admin@kanban.com",
            PasswordHash = PasswordHelper.HashPassword("Admin@123"),
            Department = "Operations",
            JobTitle = "System Administrator",
            IsSystemAdmin = true
        };

        var board = new Board
        {
            Name = "Website Kanban Project",
            Description = "Board mẫu để test kéo thả, checklist, comment và report.",
            Owner = admin,
            IsPublic = false
        };

        board.Members.Add(new BoardMember
        {
            User = admin,
            Role = BoardRole.Owner
        });

        var todo = new BoardColumn { Board = board, Name = "Todo", Position = 1, WipLimit = 5 };
        var inProgress = new BoardColumn { Board = board, Name = "In Progress", Position = 2, WipLimit = 3 };
        var done = new BoardColumn { Board = board, Name = "Done", Position = 3 };

        var card1 = new Card
        {
            Board = board,
            Column = todo,
            Title = "Thiết kế giao diện dashboard",
            Description = "Tạo layout sidebar, header và danh sách board.",
            Priority = CardPriority.High,
            DueDate = DateTime.UtcNow.AddDays(3),
            Position = 1,
            CreatedBy = admin,
            Assignee = admin
        };
        card1.Labels.Add(new CardLabel { Name = "Frontend", Color = "#2563eb" });
        card1.ChecklistItems.Add(new ChecklistItem { Content = "Tạo route dashboard", Position = 1 });
        card1.ChecklistItems.Add(new ChecklistItem { Content = "Hiển thị board cards", Position = 2 });

        var card2 = new Card
        {
            Board = board,
            Column = inProgress,
            Title = "Xây dựng API tạo card",
            Description = "Controller và service cho card CRUD.",
            Priority = CardPriority.Medium,
            DueDate = DateTime.UtcNow.AddDays(5),
            Position = 1,
            CreatedBy = admin,
            Assignee = admin
        };
        card2.Labels.Add(new CardLabel { Name = "Backend", Color = "#16a34a" });

        var card3 = new Card
        {
            Board = board,
            Column = done,
            Title = "Khởi tạo database Code First",
            Description = "Models, DbContext và migration đầu tiên.",
            Priority = CardPriority.Low,
            Position = 1,
            CreatedBy = admin,
            Assignee = admin
        };
        card3.Labels.Add(new CardLabel { Name = "Database", Color = "#f97316" });
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
    }
}
