using Kanban.API.DTOs.Notification;

namespace Kanban.API.Interfaces;

public interface INotificationService
{
    Task<List<NotificationDto>> GetNotificationsAsync(int userId);
    Task MarkAsReadAsync(int userId, int notificationId);
}
