using Kanban.API.Data;
using Kanban.API.DTOs.Card;
using Kanban.API.Interfaces;
using Kanban.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Kanban.API.Services;

public class CardService : ICardService
{
    private readonly AppDbContext _db;

    public CardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CardDto> CreateCardAsync(int userId, int columnId, CreateCardRequest request)
    {
        var column = await _db.BoardColumns.FindAsync(columnId) ?? throw new KeyNotFoundException("Không tìm thấy cột.");
        await BoardAccess.EnsureCanEditCardsAsync(_db, column.BoardId, userId);
        await BoardAccess.EnsureAssigneeInBoardAsync(_db, column.BoardId, request.AssigneeId);

        var card = new Card
        {
            BoardId = column.BoardId,
            ColumnId = columnId,
            Title = request.Title.Trim(),
            Description = request.Description,
            AssigneeId = request.AssigneeId,
            Priority = request.Priority,
            DueDate = request.DueDate,
            Position = request.Position ?? await NextPositionAsync(columnId),
            CreatedById = userId
        };

        ApplyLabels(card, request.Labels);
        _db.Cards.Add(card);
        await _db.SaveChangesAsync();

        AddActivity(card.BoardId, card.Id, userId, "CreateCard", $"Tạo thẻ {card.Title}");
        AddAssignmentNotification(card, userId);
        await _db.SaveChangesAsync();

        var saved = await LoadCardAsync(card.Id);
        return saved.ToDto();
    }

    public async Task<CardDetailDto> GetCardAsync(int userId, int cardId)
    {
        var card = await LoadCardAsync(cardId);
        await BoardAccess.EnsureMemberAsync(_db, card.BoardId, userId);
        return card.ToDetailDto();
    }

    public async Task<CardDetailDto> UpdateCardAsync(int userId, int cardId, UpdateCardRequest request)
    {
        var card = await _db.Cards
            .Include(c => c.Labels)
            .FirstOrDefaultAsync(c => c.Id == cardId)
            ?? throw new KeyNotFoundException("Không tìm thấy thẻ.");

        await BoardAccess.EnsureCanEditCardsAsync(_db, card.BoardId, userId);
        await BoardAccess.EnsureAssigneeInBoardAsync(_db, card.BoardId, request.AssigneeId);

        var oldAssigneeId = card.AssigneeId;
        card.Title = request.Title.Trim();
        card.Description = request.Description;
        card.AssigneeId = request.AssigneeId;
        card.Priority = request.Priority;
        card.DueDate = request.DueDate;
        card.Position = request.Position;
        card.IsArchived = request.IsArchived;
        card.UpdatedAt = DateTime.UtcNow;

        if (request.Labels is not null)
        {
            _db.CardLabels.RemoveRange(card.Labels);
            ApplyLabels(card, request.Labels);
        }

        AddActivity(card.BoardId, card.Id, userId, "UpdateCard", $"Cập nhật thẻ {card.Title}");
        if (oldAssigneeId != card.AssigneeId)
        {
            AddAssignmentNotification(card, userId);
        }

        await _db.SaveChangesAsync();
        return (await LoadCardAsync(cardId)).ToDetailDto();
    }

    public async Task<int> DeleteCardAsync(int userId, int cardId)
    {
        var card = await _db.Cards.FindAsync(cardId) ?? throw new KeyNotFoundException("Không tìm thấy thẻ.");
        await BoardAccess.EnsureCanEditCardsAsync(_db, card.BoardId, userId);
        var boardId = card.BoardId;
        _db.Cards.Remove(card);
        await _db.SaveChangesAsync();
        return boardId;
    }

    public async Task<CardDetailDto> MoveCardAsync(int userId, int cardId, MoveCardRequest request)
    {
        var card = await _db.Cards.FindAsync(cardId) ?? throw new KeyNotFoundException("Không tìm thấy thẻ.");
        var targetColumn = await _db.BoardColumns.FindAsync(request.TargetColumnId)
            ?? throw new KeyNotFoundException("Không tìm thấy cột đích.");

        if (card.BoardId != targetColumn.BoardId)
        {
            throw new InvalidOperationException("Không thể di chuyển thẻ sang bảng khác.");
        }

        await BoardAccess.EnsureCanEditCardsAsync(_db, card.BoardId, userId);
        card.ColumnId = request.TargetColumnId;
        card.Position = request.Position;
        card.UpdatedAt = DateTime.UtcNow;
        AddActivity(card.BoardId, card.Id, userId, "MoveCard", $"Di chuyển thẻ {card.Title}");
        await _db.SaveChangesAsync();

        return (await LoadCardAsync(cardId)).ToDetailDto();
    }

    public async Task<int> ReorderCardsAsync(int userId, ReorderCardsRequest request)
    {
        if (request.Cards.Count == 0)
        {
            return 0;
        }

        var ids = request.Cards.Select(c => c.CardId).Distinct().ToList();
        var cards = await _db.Cards.Where(c => ids.Contains(c.Id)).ToListAsync();
        if (cards.Count != ids.Count)
        {
            throw new KeyNotFoundException("Danh sách thẻ không hợp lệ.");
        }

        var boardId = cards.First().BoardId;
        if (cards.Any(c => c.BoardId != boardId))
        {
            throw new InvalidOperationException("Chỉ được sắp xếp thẻ trong cùng bảng.");
        }

        var columnIds = request.Cards.Select(c => c.ColumnId).Distinct().ToList();
        var validColumns = await _db.BoardColumns
            .Where(c => columnIds.Contains(c.Id) && c.BoardId == boardId)
            .Select(c => c.Id)
            .ToListAsync();
        if (validColumns.Count != columnIds.Count)
        {
            throw new InvalidOperationException("Cột đích không hợp lệ.");
        }

        await BoardAccess.EnsureCanEditCardsAsync(_db, boardId, userId);
        var movedCard = request.MovedCardId is int movedCardId
            ? cards.FirstOrDefault(c => c.Id == movedCardId)
            : cards.FirstOrDefault(c =>
            {
                var item = request.Cards.FirstOrDefault(r => r.CardId == c.Id);
                return item is not null && (item.ColumnId != c.ColumnId || item.Position != c.Position);
            });

        foreach (var item in request.Cards)
        {
            var card = cards.First(c => c.Id == item.CardId);
            card.ColumnId = item.ColumnId;
            card.Position = item.Position;
            card.UpdatedAt = DateTime.UtcNow;
        }

        AddActivity(boardId, null, userId, "ReorderCards", "Sắp xếp lại thẻ trong bảng");
        await AddCardMoveNotificationsAsync(boardId, userId, movedCard);
        await _db.SaveChangesAsync();
        return boardId;
    }

    public async Task<CardDetailDto> ArchiveCardAsync(int userId, int cardId)
    {
        var card = await _db.Cards.FindAsync(cardId) ?? throw new KeyNotFoundException("Không tìm thấy thẻ.");
        await BoardAccess.EnsureCanEditCardsAsync(_db, card.BoardId, userId);

        card.IsArchived = true;
        card.UpdatedAt = DateTime.UtcNow;
        AddActivity(card.BoardId, card.Id, userId, "ArchiveCard", $"Lưu trữ thẻ {card.Title}");
        await _db.SaveChangesAsync();

        return (await LoadCardAsync(cardId)).ToDetailDto();
    }

    public async Task<ChecklistItemDto> AddChecklistItemAsync(int userId, int cardId, AddChecklistItemRequest request)
    {
        var card = await _db.Cards.FindAsync(cardId) ?? throw new KeyNotFoundException("Không tìm thấy thẻ.");
        await BoardAccess.EnsureCanEditCardsAsync(_db, card.BoardId, userId);

        var item = new ChecklistItem
        {
            CardId = cardId,
            Content = request.Content.Trim(),
            Position = request.Position ?? await NextChecklistPositionAsync(cardId)
        };

        _db.ChecklistItems.Add(item);
        AddActivity(card.BoardId, card.Id, userId, "AddChecklist", $"Thêm checklist vào thẻ {card.Title}");
        await _db.SaveChangesAsync();

        return item.ToDto();
    }

    public async Task<ChecklistItemDto> UpdateChecklistItemAsync(int userId, int checklistId, UpdateChecklistItemRequest request)
    {
        var item = await _db.ChecklistItems
            .Include(i => i.Card)
            .FirstOrDefaultAsync(i => i.Id == checklistId)
            ?? throw new KeyNotFoundException("Không tìm thấy checklist.");

        await BoardAccess.EnsureCanEditCardsAsync(_db, item.Card.BoardId, userId);
        item.Content = request.Content.Trim();
        item.IsCompleted = request.IsCompleted;
        item.Position = request.Position;
        AddActivity(item.Card.BoardId, item.CardId, userId, "UpdateChecklist", $"Cập nhật checklist của thẻ {item.Card.Title}");
        await _db.SaveChangesAsync();

        return item.ToDto();
    }

    public async Task DeleteChecklistItemAsync(int userId, int checklistId)
    {
        var item = await _db.ChecklistItems
            .Include(i => i.Card)
            .FirstOrDefaultAsync(i => i.Id == checklistId)
            ?? throw new KeyNotFoundException("Không tìm thấy checklist.");

        await BoardAccess.EnsureCanEditCardsAsync(_db, item.Card.BoardId, userId);
        _db.ChecklistItems.Remove(item);
        await _db.SaveChangesAsync();
    }

    private async Task<Card> LoadCardAsync(int cardId)
    {
        return await _db.Cards
            .AsNoTracking()
            .Include(c => c.Assignee)
            .Include(c => c.CreatedBy)
            .Include(c => c.Labels)
            .Include(c => c.ChecklistItems)
            .Include(c => c.ActivityLogs).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(c => c.Id == cardId)
            ?? throw new KeyNotFoundException("Không tìm thấy thẻ.");
    }

    private async Task<int> NextPositionAsync(int columnId)
    {
        var max = await _db.Cards
            .Where(c => c.ColumnId == columnId)
            .MaxAsync(c => (int?)c.Position);
        return (max ?? 0) + 1;
    }

    private async Task<int> NextChecklistPositionAsync(int cardId)
    {
        var max = await _db.ChecklistItems
            .Where(i => i.CardId == cardId)
            .MaxAsync(i => (int?)i.Position);
        return (max ?? 0) + 1;
    }

    private static void ApplyLabels(Card card, List<UpsertLabelRequest>? labels)
    {
        if (labels is null)
        {
            return;
        }

        foreach (var label in labels.Where(l => !string.IsNullOrWhiteSpace(l.Name)))
        {
            card.Labels.Add(new CardLabel
            {
                Name = label.Name.Trim(),
                Color = string.IsNullOrWhiteSpace(label.Color) ? "#64748b" : label.Color
            });
        }
    }

    private void AddActivity(int boardId, int? cardId, int userId, string action, string description)
    {
        _db.ActivityLogs.Add(new ActivityLog
        {
            BoardId = boardId,
            CardId = cardId,
            UserId = userId,
            Action = action,
            Description = description
        });
    }

    private async Task AddCardMoveNotificationsAsync(int boardId, int actorId, Card? movedCard)
    {
        if (movedCard is null)
        {
            return;
        }

        var memberIds = await _db.BoardMembers
            .Where(member => member.BoardId == boardId && member.UserId != actorId)
            .Select(member => member.UserId)
            .Distinct()
            .ToListAsync();

        foreach (var memberId in memberIds)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = memberId,
                Title = "Thẻ trong dự án vừa được di chuyển",
                Message = $"Thẻ \"{movedCard.Title}\" vừa được cập nhật vị trí.",
                Type = "CardMoved",
                BoardId = boardId,
                CardId = movedCard.Id
            });
        }
    }

    private void AddAssignmentNotification(Card card, int actorId)
    {
        if (card.AssigneeId is null || card.AssigneeId == actorId)
        {
            return;
        }

        _db.Notifications.Add(new Notification
        {
            UserId = card.AssigneeId.Value,
            Title = "Bạn được gán vào thẻ",
            Message = $"Bạn vừa được gán vào thẻ \"{card.Title}\".",
            Type = "Assignment",
            BoardId = card.BoardId,
            CardId = card.Id
        });
    }
}
