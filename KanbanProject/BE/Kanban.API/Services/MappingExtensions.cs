using Kanban.API.DTOs.Board;
using Kanban.API.DTOs.Card;
using Kanban.API.DTOs.Chat;
using Kanban.API.DTOs.Column;
using Kanban.API.DTOs.Comment;
using Kanban.API.DTOs.Member;
using Kanban.API.DTOs.Notification;
using Kanban.API.Models;

namespace Kanban.API.Services;

public static class MappingExtensions
{
    private sealed record BoardProgress(int TotalCards, int CompletedCards, int RemainingCards, int OverdueCards, int ProgressPercent, string ProgressStatus);

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
        var isCompleted = IsCompletedCard(card);

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
            isCompleted,
            IsOverdueCard(card, isCompleted),
            card.CompletedAt,
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
            ColumnProgressHelper.IsCompletedColumn(column),
            column.Cards
                .Where(c => !c.IsArchived)
                .OrderBy(c => c.Position)
                .Select(c => c.ToDto())
                .ToList());
    }

    public static CardDetailDto ToDetailDto(this Card card)
    {
        var isCompleted = IsCompletedCard(card);

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
            isCompleted,
            IsOverdueCard(card, isCompleted),
            card.CompletedAt,
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
        var progress = CalculateProgress(board);

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
            progress.TotalCards,
            progress.CompletedCards,
            progress.RemainingCards,
            progress.OverdueCards,
            progress.ProgressPercent,
            progress.ProgressStatus,
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
        var progress = CalculateProgress(board);

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
            progress.TotalCards,
            progress.CompletedCards,
            progress.RemainingCards,
            progress.OverdueCards,
            progress.ProgressPercent,
            progress.ProgressStatus,
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
            comment.Card?.BoardId ?? 0,
            comment.UserId,
            comment.User.UserName,
            comment.User.AvatarUrl,
            comment.Content,
            comment.CreatedAt,
            comment.UpdatedAt);
    }

    public static BoardChatMessageDto ToDto(this BoardChatMessage message)
    {
        return new BoardChatMessageDto(
            message.Id,
            message.BoardId,
            message.UserId,
            message.User.UserName,
            message.User.AvatarUrl,
            message.Content,
            message.CreatedAt,
            message.EditedAt);
    }

    private static BoardProgress CalculateProgress(Board board)
    {
        var today = DateTime.UtcNow.Date;
        var cards = board.Columns
            .SelectMany(column => (column.Cards ?? new List<Card>()).Select(card => new { Card = card, Column = column }))
            .Where(item => !item.Card.IsArchived)
            .ToList();
        var totalCards = cards.Count;
        var completedCards = cards.Count(item => ColumnProgressHelper.IsCompletedColumn(item.Column));
        var overdueCards = cards.Count(item => item.Card.DueDate.HasValue && item.Card.DueDate.Value.Date < today && !ColumnProgressHelper.IsCompletedColumn(item.Column));
        var remainingCards = Math.Max(0, totalCards - completedCards);
        var progressPercent = totalCards == 0 ? 0 : (int)Math.Round(completedCards * 100.0 / totalCards, MidpointRounding.AwayFromZero);
        var progressStatus = totalCards == 0
            ? "NotStarted"
            : completedCards == totalCards
            ? "Completed"
            : overdueCards > 0
                ? "BehindSchedule"
                : "InProgress";

        return new BoardProgress(totalCards, completedCards, remainingCards, overdueCards, progressPercent, progressStatus);
    }

    private static bool IsCompletedCard(Card card)
    {
        return card.Column is not null
            ? ColumnProgressHelper.IsCompletedColumn(card.Column)
            : card.CompletedAt.HasValue;
    }

    private static bool IsOverdueCard(Card card, bool isCompleted)
    {
        return card.DueDate.HasValue
            && card.DueDate.Value.Date < DateTime.UtcNow.Date
            && !isCompleted
            && !card.IsArchived;
    }

    public static DirectMessageDto ToDto(this DirectMessage message, int currentUserId)
    {
        return new DirectMessageDto(
            message.Id,
            message.SenderId,
            message.RecipientId,
            message.Sender.FullName,
            message.Sender.AvatarUrl,
            message.Recipient.FullName,
            message.Recipient.AvatarUrl,
            message.Content,
            message.CreatedAt,
            message.ReadAt,
            message.SenderId == currentUserId);
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
