using System.Security.Claims;
using Kanban.API.Data;
using Kanban.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Kanban.API.Hubs;

[Authorize]
public class BoardHub : Hub
{
    private readonly AppDbContext _db;

    public BoardHub(AppDbContext db)
    {
        _db = db;
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, BoardRealtime.UserGroupName(CurrentUserId));
        await base.OnConnectedAsync();
    }

    public async Task JoinBoard(int boardId)
    {
        await BoardAccess.EnsureCanViewBoardAsync(_db, boardId, CurrentUserId);
        await Groups.AddToGroupAsync(Context.ConnectionId, BoardRealtime.GroupName(boardId));
    }

    public async Task LeaveBoard(int boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, BoardRealtime.GroupName(boardId));
    }

    private int CurrentUserId
    {
        get
        {
            var value = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue("nameid")
                ?? Context.User?.FindFirstValue("sub");

            if (!int.TryParse(value, out var userId))
            {
                throw new HubException("Token khong hop le.");
            }

            return userId;
        }
    }
}
