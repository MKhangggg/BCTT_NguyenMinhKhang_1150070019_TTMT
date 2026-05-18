namespace Kanban.API.Models;

public class BoardMember
{
    public int Id { get; set; }
    public int BoardId { get; set; }
    public int UserId { get; set; }
    public BoardRole Role { get; set; } = BoardRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Board Board { get; set; } = null!;
    public User User { get; set; } = null!;
}
