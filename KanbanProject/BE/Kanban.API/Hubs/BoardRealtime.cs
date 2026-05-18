using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Hubs;

public static class BoardRealtime
{
    public const string BoardChangedEvent = "BoardChanged";

    public static string GroupName(int boardId) => $"board:{boardId}";

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
}