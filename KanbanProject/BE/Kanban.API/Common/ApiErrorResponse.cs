using System.Text.Json.Serialization;

namespace Kanban.API.Common;

public sealed class ApiErrorResponse
{
    public required string Code { get; init; }

    public required string Message { get; init; }

    public required int Status { get; init; }

    public required string RequestId { get; init; }

    public DateTimeOffset TimestampUtc { get; init; } = DateTimeOffset.UtcNow;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string[]>? Errors { get; init; }
}