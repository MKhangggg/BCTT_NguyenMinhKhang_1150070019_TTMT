namespace Kanban.API.Models;

public class BoardChatMessage
{
    public int Id { get; set; }
    public int BoardId { get; set; }
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }

    public Board Board { get; set; } = null!;
    public User User { get; set; } = null!;
}
