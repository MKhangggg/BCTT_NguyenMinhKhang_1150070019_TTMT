using Kanban.API.Data;
using Kanban.API.DTOs.Notification;
using Kanban.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<NotificationDto>> GetNotificationsAsync(int userId)
    {
        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notifications.Select(n => n.ToDto()).ToList();
    }

    public async Task MarkAsReadAsync(int userId, int notificationId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy thông báo.");

        notification.IsRead = true;
        await _db.SaveChangesAsync();
    }
}
