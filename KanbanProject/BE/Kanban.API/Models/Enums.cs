namespace Kanban.API.Models;

public enum BoardRole
{
    Owner,
    Admin,
    Member,
    Viewer
}

public enum CardPriority
{
    Low,
    Medium,
    High
}

public enum OrganizationUnitType
{
    Department,
    Team
}

public enum OrganizationUnitMemberRole
{
    Member,
    Lead
}
