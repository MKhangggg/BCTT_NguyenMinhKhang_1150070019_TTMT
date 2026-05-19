namespace Kanban.API.Models;

public class OrganizationUnit
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public OrganizationUnitType Type { get; set; } = OrganizationUnitType.Department;
    public int? ParentId { get; set; }
    public int? ManagerId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public OrganizationUnit? Parent { get; set; }
    public ICollection<OrganizationUnit> Children { get; set; } = new List<OrganizationUnit>();
    public User? Manager { get; set; }
    public ICollection<OrganizationUnitMember> Members { get; set; } = new List<OrganizationUnitMember>();
    public ICollection<User> PrimaryUsers { get; set; } = new List<User>();
    public ICollection<Board> Boards { get; set; } = new List<Board>();
}
