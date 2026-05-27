using Kanban.API.DTOs.Chat;

namespace Kanban.API.Interfaces;

public interface IChatService
{
    Task<List<BoardChatMessageDto>> GetMessagesAsync(int userId, int boardId);
    Task<BoardChatMessageDto> SendMessageAsync(int userId, int boardId, SendBoardChatMessageRequest request);
    Task<List<ChatUserDto>> GetDirectChatUsersAsync(int userId);
    Task<List<DirectMessageDto>> GetDirectMessagesAsync(int userId, int otherUserId);
    Task<DirectMessageDto> SendDirectMessageAsync(int senderId, int recipientId, SendDirectMessageRequest request);
}
