namespace Kanban.API.DTOs.Comment;

public record CommentDto(int Id, int CardId, int BoardId, int UserId, string UserName, string? AvatarUrl, string Content, DateTime CreatedAt, DateTime? UpdatedAt);

public record CreateCommentRequest(string Content);

public record DeletedCommentDto(int Id, int CardId, int BoardId);
