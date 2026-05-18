using Kanban.API.DTOs.Comment;

namespace Kanban.API.Interfaces;

public interface ICommentService
{
    Task<List<CommentDto>> GetCommentsAsync(int userId, int cardId);
    Task<CommentDto> AddCommentAsync(int userId, int cardId, CreateCommentRequest request);
    Task DeleteCommentAsync(int userId, int commentId);
}
