namespace Kanban.API.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public int BoardId { get; set; }
    public int? CardId { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Board Board { get; set; } = null!;
    public Card? Card { get; set; }
    public User User { get; set; } = null!;
}
