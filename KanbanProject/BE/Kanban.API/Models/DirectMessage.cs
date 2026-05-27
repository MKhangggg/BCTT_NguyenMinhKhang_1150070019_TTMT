namespace Kanban.API.Models;

public class DirectMessage
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public int RecipientId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public bool IsDeleted { get; set; }

    public User Sender { get; set; } = null!;
    public User Recipient { get; set; } = null!;
}
