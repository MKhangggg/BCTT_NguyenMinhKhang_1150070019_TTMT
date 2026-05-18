using Kanban.API.DTOs.Board;

namespace Kanban.API.Interfaces;

public interface IBoardService
{
    Task<List<BoardSummaryDto>> GetBoardsAsync(int userId);
    Task<BoardDetailDto> GetBoardAsync(int userId, int boardId);
    Task<BoardDetailDto> CreateBoardAsync(int userId, CreateBoardRequest request);
    Task<BoardDetailDto> UpdateBoardAsync(int userId, int boardId, UpdateBoardRequest request);
    Task DeleteBoardAsync(int userId, int boardId);
}
