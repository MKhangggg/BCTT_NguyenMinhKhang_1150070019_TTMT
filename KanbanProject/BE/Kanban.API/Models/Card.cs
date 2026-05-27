namespace Kanban.API.Models;

public class Card
{
    public int Id { get; set; }
    public int ColumnId { get; set; }
    public int BoardId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? AssigneeId { get; set; }
    public CardPriority Priority { get; set; } = CardPriority.Medium;
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int Position { get; set; }
    public bool IsArchived { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public BoardColumn Column { get; set; } = null!;
    public Board Board { get; set; } = null!;
    public User? Assignee { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<CardLabel> Labels { get; set; } = new List<CardLabel>();
    public ICollection<ChecklistItem> ChecklistItems { get; set; } = new List<ChecklistItem>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
