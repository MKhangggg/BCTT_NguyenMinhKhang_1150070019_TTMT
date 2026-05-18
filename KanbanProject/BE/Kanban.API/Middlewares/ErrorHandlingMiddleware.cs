using System.Net;
using Kanban.API.Common;

namespace Kanban.API.Middlewares;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var requestId = context.TraceIdentifier;
            var statusCode = ex switch
            {
                UnauthorizedAccessException => HttpStatusCode.Unauthorized,
                ForbiddenException => HttpStatusCode.Forbidden,
                KeyNotFoundException => HttpStatusCode.NotFound,
                InvalidOperationException or ArgumentException => HttpStatusCode.BadRequest,
                _ => HttpStatusCode.InternalServerError
            };

            if (statusCode == HttpStatusCode.InternalServerError)
            {
                _logger.LogError(ex, "Lỗi API chưa xử lý. RequestId: {RequestId}", requestId);
            }
            else
            {
                _logger.LogWarning(ex, "Lỗi API đã xử lý. RequestId: {RequestId}", requestId);
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;
            context.Response.Headers["X-Request-Id"] = requestId;

            var payload = new ApiErrorResponse
            {
                Code = statusCode switch
                {
                    HttpStatusCode.Forbidden => ApiErrorCodes.Forbidden,
                    HttpStatusCode.NotFound => ApiErrorCodes.NotFound,
                    HttpStatusCode.BadRequest => ApiErrorCodes.BadRequest,
                    HttpStatusCode.Unauthorized => ApiErrorCodes.Unauthorized,
                    _ => ApiErrorCodes.InternalServerError
                },
                Message = statusCode == HttpStatusCode.InternalServerError
                    ? "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
                    : ex.Message,
                Status = (int)statusCode,
                RequestId = requestId
            };

            await context.Response.WriteAsJsonAsync(payload);
        }
    }
}
