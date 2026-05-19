using Kanban.API.Models;

namespace Kanban.API.DTOs.Card;

public record LabelDto(int Id, string Name, string Color);

public record UpsertLabelRequest(string Name, string Color);

public record ChecklistItemDto(int Id, string Content, bool IsCompleted, int Position, DateTime CreatedAt);

public record AddChecklistItemRequest(string Content, int? Position);

public record UpdateChecklistItemRequest(string Content, bool IsCompleted, int Position);

public record ActivityLogDto(int Id, int? CardId, int UserId, string UserName, string Action, string Description, DateTime CreatedAt);

public record CardDto(
    int Id,
    int BoardId,
    int ColumnId,
    string Title,
    string? Description,
    int? AssigneeId,
    string? AssigneeName,
    string? AssigneeAvatarUrl,
    CardPriority Priority,
    DateTime? DueDate,
    int Position,
    bool IsArchived,
    List<LabelDto> Labels);

public record CardDetailDto(
    int Id,
    int BoardId,
    int ColumnId,
    string Title,
    string? Description,
    int? AssigneeId,
    string? AssigneeName,
    string? AssigneeAvatarUrl,
    CardPriority Priority,
    DateTime? DueDate,
    int Position,
    bool IsArchived,
    int CreatedById,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<LabelDto> Labels,
    List<ChecklistItemDto> ChecklistItems,
    List<ActivityLogDto> ActivityLogs);

public record CreateCardRequest(string Title, string? Description, int? AssigneeId, CardPriority Priority, DateTime? DueDate, int? Position, List<UpsertLabelRequest>? Labels);

public record UpdateCardRequest(string Title, string? Description, int? AssigneeId, CardPriority Priority, DateTime? DueDate, int Position, bool IsArchived, List<UpsertLabelRequest>? Labels);

public record MoveCardRequest(int TargetColumnId, int Position);

public record ReorderCardItem(int CardId, int ColumnId, int Position);

public record ReorderCardsRequest(List<ReorderCardItem> Cards, int? MovedCardId = null);
