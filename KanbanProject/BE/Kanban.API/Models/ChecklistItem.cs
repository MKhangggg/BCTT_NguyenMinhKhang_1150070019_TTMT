namespace Kanban.API.Models;

public class ChecklistItem
{
    public int Id { get; set; }
    public int CardId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int Position { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Card Card { get; set; } = null!;
}
