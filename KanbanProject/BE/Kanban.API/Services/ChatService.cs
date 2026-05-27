using Kanban.API.Data;
using Kanban.API.DTOs.Chat;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class ChatService : IChatService
{
    private readonly AppDbContext _db;

    public ChatService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<BoardChatMessageDto>> GetMessagesAsync(int userId, int boardId)
    {
        await BoardAccess.EnsureCanViewBoardAsync(_db, boardId, userId);

        var messages = await _db.BoardChatMessages
            .AsNoTracking()
            .Include(message => message.User)
            .Where(message => message.BoardId == boardId && !message.IsDeleted)
            .OrderByDescending(message => message.CreatedAt)
            .Take(100)
            .OrderBy(message => message.CreatedAt)
            .ToListAsync();

        return messages.Select(message => message.ToDto()).ToList();
    }

    public async Task<BoardChatMessageDto> SendMessageAsync(int userId, int boardId, SendBoardChatMessageRequest request)
    {
        await BoardAccess.EnsureCanEditCardsAsync(_db, boardId, userId);
        var content = request.Content.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("Nội dung tin nhắn không được để trống.");
        }

        var message = new BoardChatMessage
        {
            BoardId = boardId,
            UserId = userId,
            Content = content
        };

        _db.BoardChatMessages.Add(message);
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            UserId = userId,
            Action = "BoardChat",
            Description = "Gửi tin nhắn trong dự án"
        });
        await _db.SaveChangesAsync();

        return (await _db.BoardChatMessages
            .AsNoTracking()
            .Include(item => item.User)
            .FirstAsync(item => item.Id == message.Id)).ToDto();
    }

    public async Task<List<ChatUserDto>> GetDirectChatUsersAsync(int userId)
    {
        var users = await _db.Users
            .AsNoTracking()
            .Where(user => user.IsActive && user.Id != userId)
            .OrderBy(user => user.FullName)
            .Select(user => new
            {
                user.Id,
                user.FullName,
                user.UserName,
                user.Email,
                user.AvatarUrl,
                user.Department,
                user.JobTitle
            })
            .ToListAsync();
        var userIds = users.Select(user => user.Id).ToList();
        var messages = await _db.DirectMessages
            .AsNoTracking()
            .Where(message => !message.IsDeleted
                && ((message.SenderId == userId && userIds.Contains(message.RecipientId))
                    || (message.RecipientId == userId && userIds.Contains(message.SenderId))))
            .OrderByDescending(message => message.CreatedAt)
            .ToListAsync();
        var latestByUser = messages
            .GroupBy(message => message.SenderId == userId ? message.RecipientId : message.SenderId)
            .ToDictionary(group => group.Key, group => group.First());
        var unreadByUser = messages
            .Where(message => message.RecipientId == userId && message.ReadAt == null)
            .GroupBy(message => message.SenderId)
            .ToDictionary(group => group.Key, group => group.Count());

        return users
            .Select(user =>
            {
                latestByUser.TryGetValue(user.Id, out var latest);
                unreadByUser.TryGetValue(user.Id, out var unreadCount);
                return new ChatUserDto(
                    user.Id,
                    user.FullName,
                    user.UserName,
                    user.Email,
                    user.AvatarUrl,
                    user.Department,
                    user.JobTitle,
                    unreadCount,
                    latest?.Content,
                    latest?.CreatedAt);
            })
            .OrderByDescending(user => user.LastMessageAt ?? DateTime.MinValue)
            .ThenBy(user => user.FullName)
            .ToList();
    }

    public async Task<List<DirectMessageDto>> GetDirectMessagesAsync(int userId, int otherUserId)
    {
        await EnsureDirectRecipientAsync(userId, otherUserId);
        var unreadMessages = await _db.DirectMessages
            .Where(message => message.SenderId == otherUserId
                && message.RecipientId == userId
                && message.ReadAt == null
                && !message.IsDeleted)
            .ToListAsync();

        foreach (var message in unreadMessages)
        {
            message.ReadAt = DateTime.UtcNow;
        }

        if (unreadMessages.Count > 0)
        {
            await _db.SaveChangesAsync();
        }

        var messages = await _db.DirectMessages
            .AsNoTracking()
            .Include(message => message.Sender)
            .Include(message => message.Recipient)
            .Where(message => !message.IsDeleted
                && ((message.SenderId == userId && message.RecipientId == otherUserId)
                    || (message.SenderId == otherUserId && message.RecipientId == userId)))
            .OrderByDescending(message => message.CreatedAt)
            .Take(100)
            .OrderBy(message => message.CreatedAt)
            .ToListAsync();

        return messages.Select(message => message.ToDto(userId)).ToList();
    }

    public async Task<DirectMessageDto> SendDirectMessageAsync(int senderId, int recipientId, SendDirectMessageRequest request)
    {
        var recipient = await EnsureDirectRecipientAsync(senderId, recipientId);
        var sender = await _db.Users.FirstAsync(user => user.Id == senderId && user.IsActive);
        var content = request.Content.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("Nội dung tin nhắn không được để trống.");
        }

        var message = new DirectMessage
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Content = content
        };

        _db.DirectMessages.Add(message);
        _db.Notifications.Add(new Notification
        {
            UserId = recipientId,
            Title = $"Tin nhắn mới từ {sender.FullName}",
            Message = content.Length > 140 ? $"{content[..140]}..." : content,
            Type = "DirectMessage"
        });
        await _db.SaveChangesAsync();

        return (await _db.DirectMessages
            .AsNoTracking()
            .Include(item => item.Sender)
            .Include(item => item.Recipient)
            .FirstAsync(item => item.Id == message.Id)).ToDto(senderId);
    }

    private async Task<User> EnsureDirectRecipientAsync(int senderId, int recipientId)
    {
        if (senderId == recipientId)
        {
            throw new InvalidOperationException("Không thể tự nhắn tin cho chính mình.");
        }

        return await _db.Users.FirstOrDefaultAsync(user => user.Id == recipientId && user.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng để nhắn tin.");
    }
}
