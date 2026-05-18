using Kanban.API.DTOs.Card;

namespace Kanban.API.Interfaces;

public interface ICardService
{
    Task<CardDto> CreateCardAsync(int userId, int columnId, CreateCardRequest request);
    Task<CardDetailDto> GetCardAsync(int userId, int cardId);
    Task<CardDetailDto> UpdateCardAsync(int userId, int cardId, UpdateCardRequest request);
    Task<int> DeleteCardAsync(int userId, int cardId);
    Task<CardDetailDto> MoveCardAsync(int userId, int cardId, MoveCardRequest request);
    Task<int> ReorderCardsAsync(int userId, ReorderCardsRequest request);
    Task<CardDetailDto> ArchiveCardAsync(int userId, int cardId);
    Task<ChecklistItemDto> AddChecklistItemAsync(int userId, int cardId, AddChecklistItemRequest request);
    Task<ChecklistItemDto> UpdateChecklistItemAsync(int userId, int checklistId, UpdateChecklistItemRequest request);
    Task DeleteChecklistItemAsync(int userId, int checklistId);
}
