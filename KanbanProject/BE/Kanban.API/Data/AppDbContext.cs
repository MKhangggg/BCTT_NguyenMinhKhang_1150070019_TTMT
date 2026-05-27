using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<OrganizationUnit> OrganizationUnits => Set<OrganizationUnit>();
    public DbSet<OrganizationUnitMember> OrganizationUnitMembers => Set<OrganizationUnitMember>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<ProjectDocument> ProjectDocuments => Set<ProjectDocument>();
    public DbSet<BoardMember> BoardMembers => Set<BoardMember>();
    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<CardLabel> CardLabels => Set<CardLabel>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<BoardChatMessage> BoardChatMessages => Set<BoardChatMessage>();
    public DbSet<DirectMessage> DirectMessages => Set<DirectMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.UserName).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(160);
            entity.Property(u => u.UserName).HasMaxLength(80);
            entity.Property(u => u.FullName).HasMaxLength(160);
            entity.Property(u => u.Department).HasMaxLength(120);
            entity.Property(u => u.JobTitle).HasMaxLength(120);
            entity.HasOne(u => u.OrganizationUnit)
                .WithMany(unit => unit.PrimaryUsers)
                .HasForeignKey(u => u.OrganizationUnitId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<OrganizationUnit>(entity =>
        {
            entity.HasIndex(u => u.Code).IsUnique();
            entity.Property(u => u.Code).HasMaxLength(40);
            entity.Property(u => u.Name).HasMaxLength(160);
            entity.Property(u => u.Description).HasMaxLength(500);
            entity.Property(u => u.Type).HasConversion<string>().HasMaxLength(30);
            entity.HasOne(u => u.Parent)
                .WithMany(u => u.Children)
                .HasForeignKey(u => u.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(u => u.Manager)
                .WithMany(u => u.ManagedOrganizationUnits)
                .HasForeignKey(u => u.ManagerId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<OrganizationUnitMember>(entity =>
        {
            entity.HasIndex(m => new { m.OrganizationUnitId, m.UserId }).IsUnique();
            entity.Property(m => m.Role).HasConversion<string>().HasMaxLength(30);
            entity.HasOne(m => m.OrganizationUnit)
                .WithMany(u => u.Members)
                .HasForeignKey(m => m.OrganizationUnitId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(m => m.User)
                .WithMany(u => u.OrganizationUnitMemberships)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Board>(entity =>
        {
            entity.Property(b => b.Name).HasMaxLength(160);
            entity.Property(b => b.ProjectCode).HasMaxLength(40);
            entity.Property(b => b.Summary).HasMaxLength(2000);
            entity.HasOne(b => b.Owner)
                .WithMany(u => u.OwnedBoards)
                .HasForeignKey(b => b.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(b => b.OrganizationUnit)
                .WithMany(u => u.Boards)
                .HasForeignKey(b => b.OrganizationUnitId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<ProjectDocument>(entity =>
        {
            entity.Property(d => d.Title).HasMaxLength(180);
            entity.Property(d => d.Description).HasMaxLength(500);
            entity.Property(d => d.Url).HasMaxLength(1000);
            entity.HasOne(d => d.Board)
                .WithMany(b => b.Documents)
                .HasForeignKey(d => d.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BoardMember>(entity =>
        {
            entity.HasIndex(m => new { m.BoardId, m.UserId }).IsUnique();
            entity.Property(m => m.Role).HasConversion<string>().HasMaxLength(30);
            entity.HasOne(m => m.Board)
                .WithMany(b => b.Members)
                .HasForeignKey(m => m.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(m => m.User)
                .WithMany(u => u.BoardMembers)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BoardColumn>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(120);
            entity.Property(c => c.IsDone).HasDefaultValue(false);
            entity.HasIndex(c => c.BoardId)
                .IsUnique()
                .HasDatabaseName("UX_BoardColumns_OneDoneColumn")
                .HasFilter("[IsDone] = CAST(1 AS bit)");
            entity.HasOne(c => c.Board)
                .WithMany(b => b.Columns)
                .HasForeignKey(c => c.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Card>(entity =>
        {
            entity.Property(c => c.Title).HasMaxLength(220);
            entity.Property(c => c.Priority).HasConversion<string>().HasMaxLength(30);
            entity.HasOne(c => c.Board)
                .WithMany(b => b.Cards)
                .HasForeignKey(c => c.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(c => c.Column)
                .WithMany(c => c.Cards)
                .HasForeignKey(c => c.ColumnId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(c => c.Assignee)
                .WithMany(u => u.AssignedCards)
                .HasForeignKey(c => c.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(c => c.CreatedBy)
                .WithMany(u => u.CreatedCards)
                .HasForeignKey(c => c.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CardLabel>(entity =>
        {
            entity.Property(l => l.Name).HasMaxLength(80);
            entity.Property(l => l.Color).HasMaxLength(20);
            entity.HasOne(l => l.Card)
                .WithMany(c => c.Labels)
                .HasForeignKey(l => l.CardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChecklistItem>(entity =>
        {
            entity.Property(i => i.Content).HasMaxLength(300);
            entity.HasOne(i => i.Card)
                .WithMany(c => c.ChecklistItems)
                .HasForeignKey(i => i.CardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.Property(c => c.Content).HasMaxLength(2000);
            entity.HasOne(c => c.Card)
                .WithMany(c => c.Comments)
                .HasForeignKey(c => c.CardId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BoardChatMessage>(entity =>
        {
            entity.Property(m => m.Content).HasMaxLength(2000);
            entity.HasOne(m => m.Board)
                .WithMany(b => b.ChatMessages)
                .HasForeignKey(m => m.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(m => m.User)
                .WithMany(u => u.BoardChatMessages)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DirectMessage>(entity =>
        {
            entity.Property(m => m.Content).HasMaxLength(2000);
            entity.HasOne(m => m.Sender)
                .WithMany(u => u.SentDirectMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(m => m.Recipient)
                .WithMany(u => u.ReceivedDirectMessages)
                .HasForeignKey(m => m.RecipientId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.Property(n => n.Title).HasMaxLength(160);
            entity.Property(n => n.Type).HasMaxLength(60);
            entity.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.Property(a => a.Action).HasMaxLength(80);
            entity.HasOne(a => a.Board)
                .WithMany(b => b.ActivityLogs)
                .HasForeignKey(a => a.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(a => a.Card)
                .WithMany(c => c.ActivityLogs)
                .HasForeignKey(a => a.CardId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(a => a.User)
                .WithMany(u => u.ActivityLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
