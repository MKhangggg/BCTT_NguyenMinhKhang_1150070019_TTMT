namespace Kanban.API.Models;

public class Comment
{
    public int Id { get; set; }
    public int CardId { get; set; }
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Card Card { get; set; } = null!;
    public User User { get; set; } = null!;
}
