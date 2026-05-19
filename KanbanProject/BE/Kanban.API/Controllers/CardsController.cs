using Kanban.API.DTOs.Card;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;

namespace Kanban.API.Controllers;

[Authorize]
[Route("api")]
public class CardsController : ApiControllerBase
{
    private readonly ICardService _cardService;
    private readonly IHubContext<BoardHub> _hubContext;

    public CardsController(ICardService cardService, IHubContext<BoardHub> hubContext)
    {
        _cardService = cardService;
        _hubContext = hubContext;
    }

    [HttpPost("columns/{columnId:int}/cards")]
    public async Task<ActionResult<CardDto>> CreateCard(int columnId, CreateCardRequest request)
    {
        var card = await _cardService.CreateCardAsync(CurrentUserId, columnId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, card.BoardId, "CardCreated", CurrentUserId, new { cardId = card.Id, columnId });
        return Ok(card);
    }

    [HttpGet("cards/{cardId:int}")]
    public async Task<ActionResult<CardDetailDto>> GetCard(int cardId)
    {
        return Ok(await _cardService.GetCardAsync(CurrentUserId, cardId));
    }

    [HttpPut("cards/{cardId:int}")]
    public async Task<ActionResult<CardDetailDto>> UpdateCard(int cardId, UpdateCardRequest request)
    {
        var card = await _cardService.UpdateCardAsync(CurrentUserId, cardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, card.BoardId, "CardUpdated", CurrentUserId, new { cardId });
        return Ok(card);
    }

    [HttpDelete("cards/{cardId:int}")]
    public async Task<IActionResult> DeleteCard(int cardId)
    {
        var boardId = await _cardService.DeleteCardAsync(CurrentUserId, cardId);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "CardDeleted", CurrentUserId, new { cardId });
        return NoContent();
    }

    [HttpPut("cards/{cardId:int}/move")]
    public async Task<ActionResult<CardDetailDto>> MoveCard(int cardId, MoveCardRequest request)
    {
        var card = await _cardService.MoveCardAsync(CurrentUserId, cardId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, card.BoardId, "CardMoved", CurrentUserId, new { cardId, request.TargetColumnId, request.Position });
        return Ok(card);
    }

    [HttpPut("cards/reorder")]
    public async Task<IActionResult> ReorderCards(ReorderCardsRequest request)
    {
        var boardId = await _cardService.ReorderCardsAsync(CurrentUserId, request);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, boardId, "CardsReordered", CurrentUserId, new { request.Cards, request.MovedCardId });
        return NoContent();
    }

    [HttpPut("cards/{cardId:int}/archive")]
    public async Task<ActionResult<CardDetailDto>> ArchiveCard(int cardId)
    {
        var card = await _cardService.ArchiveCardAsync(CurrentUserId, cardId);
        await BoardRealtime.BroadcastBoardChangedAsync(_hubContext, card.BoardId, "CardArchived", CurrentUserId, new { cardId });
        return Ok(card);
    }

    [HttpPost("cards/{cardId:int}/checklists")]
    public async Task<ActionResult<ChecklistItemDto>> AddChecklistItem(int cardId, AddChecklistItemRequest request)
    {
        return Ok(await _cardService.AddChecklistItemAsync(CurrentUserId, cardId, request));
    }

    [HttpPut("checklists/{id:int}")]
    public async Task<ActionResult<ChecklistItemDto>> UpdateChecklistItem(int id, UpdateChecklistItemRequest request)
    {
        return Ok(await _cardService.UpdateChecklistItemAsync(CurrentUserId, id, request));
    }

    [HttpDelete("checklists/{id:int}")]
    public async Task<IActionResult> DeleteChecklistItem(int id)
    {
        await _cardService.DeleteChecklistItemAsync(CurrentUserId, id);
        return NoContent();
    }
}
