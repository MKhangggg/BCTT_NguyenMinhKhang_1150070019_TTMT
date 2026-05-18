using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("nameid")
                ?? User.FindFirstValue("sub");
            if (!int.TryParse(value, out var userId))
            {
                throw new UnauthorizedAccessException("Token không hợp lệ.");
            }

            return userId;
        }
    }
}
