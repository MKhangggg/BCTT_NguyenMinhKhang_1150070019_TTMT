namespace Kanban.API.DTOs.Chat;

public record BoardChatMessageDto(
    int Id,
    int BoardId,
    int UserId,
    string UserName,
    string? AvatarUrl,
    string Content,
    DateTime CreatedAt,
    DateTime? EditedAt);

public record SendBoardChatMessageRequest(string Content);

public record ChatUserDto(
    int UserId,
    string FullName,
    string UserName,
    string Email,
    string? AvatarUrl,
    string? Department,
    string? JobTitle,
    int UnreadCount,
    string? LastMessage,
    DateTime? LastMessageAt);

public record DirectMessageDto(
    int Id,
    int SenderId,
    int RecipientId,
    string SenderName,
    string? SenderAvatarUrl,
    string RecipientName,
    string? RecipientAvatarUrl,
    string Content,
    DateTime CreatedAt,
    DateTime? ReadAt,
    bool IsMine);

public record SendDirectMessageRequest(string Content);
