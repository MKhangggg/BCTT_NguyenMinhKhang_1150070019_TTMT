namespace Kanban.API.Models;

public class OrganizationUnitMember
{
    public int Id { get; set; }
    public int OrganizationUnitId { get; set; }
    public int UserId { get; set; }
    public OrganizationUnitMemberRole Role { get; set; } = OrganizationUnitMemberRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public OrganizationUnit OrganizationUnit { get; set; } = null!;
    public User User { get; set; } = null!;
}
