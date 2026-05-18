namespace Kanban.API.DTOs.Comment;

public record CommentDto(int Id, int CardId, int UserId, string UserName, string? AvatarUrl, string Content, DateTime CreatedAt, DateTime? UpdatedAt);

public record CreateCommentRequest(string Content);
