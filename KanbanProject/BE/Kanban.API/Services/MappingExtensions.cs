using Kanban.API.DTOs.Board;
using Kanban.API.DTOs.Card;
using Kanban.API.DTOs.Column;
using Kanban.API.DTOs.Comment;
using Kanban.API.DTOs.Member;
using Kanban.API.DTOs.Notification;
using Kanban.API.Models;

namespace Kanban.API.Services;

public static class MappingExtensions
{
    public static BoardMemberDto ToDto(this BoardMember member)
    {
        return new BoardMemberDto(
            member.Id,
            member.BoardId,
            member.UserId,
            member.User.FullName,
            member.User.UserName,
            member.User.Email,
            member.User.AvatarUrl,
            member.Role,
            member.JoinedAt);
    }

    public static LabelDto ToDto(this CardLabel label)
    {
        return new LabelDto(label.Id, label.Name, label.Color);
    }

    public static ChecklistItemDto ToDto(this ChecklistItem item)
    {
        return new ChecklistItemDto(item.Id, item.Content, item.IsCompleted, item.Position, item.CreatedAt);
    }

    public static CardDto ToDto(this Card card)
    {
        return new CardDto(
            card.Id,
            card.BoardId,
            card.ColumnId,
            card.Title,
            card.Description,
            card.AssigneeId,
            card.Assignee?.FullName,
            card.Assignee?.AvatarUrl,
            card.Priority,
            card.DueDate,
            card.Position,
            card.IsArchived,
            card.Labels.OrderBy(l => l.Id).Select(l => l.ToDto()).ToList());
    }

    public static BoardColumnDto ToDto(this BoardColumn column)
    {
        return new BoardColumnDto(
            column.Id,
            column.BoardId,
            column.Name,
            column.Position,
            column.WipLimit,
            column.Cards
                .Where(c => !c.IsArchived)
                .OrderBy(c => c.Position)
                .Select(c => c.ToDto())
                .ToList());
    }

    public static CardDetailDto ToDetailDto(this Card card)
    {
        return new CardDetailDto(
            card.Id,
            card.BoardId,
            card.ColumnId,
            card.Title,
            card.Description,
            card.AssigneeId,
            card.Assignee?.FullName,
            card.Assignee?.AvatarUrl,
            card.Priority,
            card.DueDate,
            card.Position,
            card.IsArchived,
            card.CreatedById,
            card.CreatedBy.FullName,
            card.CreatedAt,
            card.UpdatedAt,
            card.Labels.OrderBy(l => l.Id).Select(l => l.ToDto()).ToList(),
            card.ChecklistItems.OrderBy(i => i.Position).Select(i => i.ToDto()).ToList(),
            card.ActivityLogs.OrderByDescending(a => a.CreatedAt).Select(a => a.ToDto()).ToList());
    }

    public static BoardSummaryDto ToSummaryDto(this Board board)
    {
        return new BoardSummaryDto(
            board.Id,
            board.ProjectCode,
            board.Name,
            board.Description,
            board.Summary,
            board.OwnerId,
            board.OrganizationUnitId,
            board.OrganizationUnit?.Code,
            board.OrganizationUnit?.Name,
            board.OrganizationUnit?.Type.ToString(),
            board.IsPublic,
            board.Members.Count,
            board.Documents.Count,
            board.CreatedAt,
            board.UpdatedAt);
    }

    public static ProjectDocumentDto ToDto(this ProjectDocument document)
    {
        return new ProjectDocumentDto(
            document.Id,
            document.BoardId,
            document.Title,
            document.Description,
            document.Url,
            document.CreatedAt);
    }

    public static BoardDetailDto ToDetailDto(this Board board)
    {
        return new BoardDetailDto(
            board.Id,
            board.ProjectCode,
            board.Name,
            board.Description,
            board.Summary,
            board.OwnerId,
            board.OrganizationUnitId,
            board.OrganizationUnit?.Code,
            board.OrganizationUnit?.Name,
            board.OrganizationUnit?.Type.ToString(),
            board.IsPublic,
            board.CreatedAt,
            board.UpdatedAt,
            board.Documents.OrderByDescending(d => d.CreatedAt).Select(d => d.ToDto()).ToList(),
            board.Members.OrderBy(m => m.Role).ThenBy(m => m.User.FullName).Select(m => m.ToDto()).ToList(),
            board.Columns.OrderBy(c => c.Position).Select(c => c.ToDto()).ToList());
    }

    public static CommentDto ToDto(this Comment comment)
    {
        return new CommentDto(
            comment.Id,
            comment.CardId,
            comment.UserId,
            comment.User.UserName,
            comment.User.AvatarUrl,
            comment.Content,
            comment.CreatedAt,
            comment.UpdatedAt);
    }

    public static ActivityLogDto ToDto(this ActivityLog activity)
    {
        return new ActivityLogDto(
            activity.Id,
            activity.CardId,
            activity.UserId,
            activity.User.UserName,
            activity.Action,
            activity.Description,
            activity.CreatedAt);
    }

    public static NotificationDto ToDto(this Notification notification)
    {
        return new NotificationDto(
            notification.Id,
            notification.Title,
            notification.Message,
            notification.Type,
            notification.IsRead,
            notification.CreatedAt,
            notification.BoardId,
            notification.CardId);
    }
}
