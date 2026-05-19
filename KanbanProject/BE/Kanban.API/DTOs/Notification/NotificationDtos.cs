namespace Kanban.API.DTOs.Notification;

public record NotificationDto(
    int Id,
    string Title,
    string Message,
    string Type,
    bool IsRead,
    DateTime CreatedAt,
    int? BoardId,
    int? CardId);
