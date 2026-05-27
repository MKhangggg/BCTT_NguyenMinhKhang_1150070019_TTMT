namespace Kanban.API.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Department { get; set; }
    public int? OrganizationUnitId { get; set; }
    public string? JobTitle { get; set; }
    public bool IsSystemAdmin { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public OrganizationUnit? OrganizationUnit { get; set; }
    public ICollection<OrganizationUnit> ManagedOrganizationUnits { get; set; } = new List<OrganizationUnit>();
    public ICollection<OrganizationUnitMember> OrganizationUnitMemberships { get; set; } = new List<OrganizationUnitMember>();
    public ICollection<Board> OwnedBoards { get; set; } = new List<Board>();
    public ICollection<BoardMember> BoardMembers { get; set; } = new List<BoardMember>();
    public ICollection<Card> AssignedCards { get; set; } = new List<Card>();
    public ICollection<Card> CreatedCards { get; set; } = new List<Card>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<BoardChatMessage> BoardChatMessages { get; set; } = new List<BoardChatMessage>();
    public ICollection<DirectMessage> SentDirectMessages { get; set; } = new List<DirectMessage>();
    public ICollection<DirectMessage> ReceivedDirectMessages { get; set; } = new List<DirectMessage>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
