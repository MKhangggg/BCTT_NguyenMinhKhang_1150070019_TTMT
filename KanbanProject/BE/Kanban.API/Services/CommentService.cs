using Kanban.API.Common;
using Kanban.API.Data;
using Kanban.API.DTOs.Comment;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class CommentService : ICommentService
{
    private readonly AppDbContext _db;

    public CommentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CommentDto>> GetCommentsAsync(int userId, int cardId)
    {
        var card = await _db.Cards.AsNoTracking().FirstOrDefaultAsync(c => c.Id == cardId)
            ?? throw new KeyNotFoundException("Không tìm thấy card.");
        await BoardAccess.EnsureMemberAsync(_db, card.BoardId, userId);

        var comments = await _db.Comments
            .AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.CardId == cardId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return comments.Select(c => c.ToDto()).ToList();
    }

    public async Task<CommentDto> AddCommentAsync(int userId, int cardId, CreateCommentRequest request)
    {
        var card = await _db.Cards.FirstOrDefaultAsync(c => c.Id == cardId)
            ?? throw new KeyNotFoundException("Không tìm thấy card.");
        await BoardAccess.EnsureCanEditCardsAsync(_db, card.BoardId, userId);

        var comment = new Comment
        {
            CardId = cardId,
            UserId = userId,
            Content = request.Content.Trim()
        };

        _db.Comments.Add(comment);
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = card.BoardId,
            CardId = cardId,
            UserId = userId,
            Action = "Comment",
            Description = $"Bình luận trong card {card.Title}"
        });
        await _db.SaveChangesAsync();

        return (await _db.Comments.AsNoTracking().Include(c => c.User).FirstAsync(c => c.Id == comment.Id)).ToDto();
    }

    public async Task DeleteCommentAsync(int userId, int commentId)
    {
        var comment = await _db.Comments
            .Include(c => c.Card)
            .FirstOrDefaultAsync(c => c.Id == commentId)
            ?? throw new KeyNotFoundException("Không tìm thấy bình luận.");

        var role = await BoardAccess.EnsureMemberAsync(_db, comment.Card.BoardId, userId);
        if (comment.UserId != userId && role is not (BoardRole.Owner or BoardRole.Admin))
        {
            throw new ForbiddenException("Bạn chỉ được xóa bình luận của mình.");
        }

        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();
    }
}
