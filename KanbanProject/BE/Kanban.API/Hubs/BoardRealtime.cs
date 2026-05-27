using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Hubs;

public static class BoardRealtime
{
    public const string BoardChangedEvent = "BoardChanged";
    public const string BoardListChangedEvent = "BoardListChanged";
    public const string DirectMessageChangedEvent = "DirectMessageChanged";

    public static string GroupName(int boardId) => $"board:{boardId}";
    public static string UserGroupName(int userId) => $"user:{userId}";

    public static Task BroadcastBoardChangedAsync(
        IHubContext<BoardHub> hubContext,
        int boardId,
        string action,
        int actorId,
        object? data = null)
    {
        var payload = new
        {
            boardId,
            action,
            actorId,
            data,
            changedAtUtc = DateTimeOffset.UtcNow
        };

        return hubContext.Clients.Group(GroupName(boardId)).SendAsync(BoardChangedEvent, payload);
    }

    public static Task BroadcastBoardListChangedAsync(
        IHubContext<BoardHub> hubContext,
        string action,
        int actorId,
        object? data = null)
    {
        var payload = new
        {
            action,
            actorId,
            data,
            changedAtUtc = DateTimeOffset.UtcNow
        };

        return hubContext.Clients.All.SendAsync(BoardListChangedEvent, payload);
    }

    public static Task BroadcastDirectMessageAsync(
        IHubContext<BoardHub> hubContext,
        int senderId,
        int recipientId,
        string action,
        int actorId,
        object? data = null)
    {
        var payload = new
        {
            action,
            actorId,
            senderId,
            recipientId,
            data,
            changedAtUtc = DateTimeOffset.UtcNow
        };

        return senderId == recipientId
            ? hubContext.Clients.Group(UserGroupName(senderId)).SendAsync(DirectMessageChangedEvent, payload)
            : Task.WhenAll(
                hubContext.Clients.Group(UserGroupName(senderId)).SendAsync(DirectMessageChangedEvent, payload),
                hubContext.Clients.Group(UserGroupName(recipientId)).SendAsync(DirectMessageChangedEvent, payload));
    }
}
