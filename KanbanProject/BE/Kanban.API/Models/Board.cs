namespace Kanban.API.Models;

public class Board
{
    public int Id { get; set; }
    public string? ProjectCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Summary { get; set; }
    public int OwnerId { get; set; }
    public int? OrganizationUnitId { get; set; }
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User Owner { get; set; } = null!;
    public OrganizationUnit? OrganizationUnit { get; set; }
    public ICollection<BoardMember> Members { get; set; } = new List<BoardMember>();
    public ICollection<ProjectDocument> Documents { get; set; } = new List<ProjectDocument>();
    public ICollection<BoardColumn> Columns { get; set; } = new List<BoardColumn>();
    public ICollection<Card> Cards { get; set; } = new List<Card>();
    public ICollection<BoardChatMessage> ChatMessages { get; set; } = new List<BoardChatMessage>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
