using Kanban.API.DTOs.Column;

namespace Kanban.API.Interfaces;

public interface IColumnService
{
    Task<BoardColumnDto> CreateColumnAsync(int userId, int boardId, CreateColumnRequest request);
    Task<BoardColumnDto> UpdateColumnAsync(int userId, int columnId, UpdateColumnRequest request);
    Task<int> DeleteColumnAsync(int userId, int columnId);
    Task<int> ReorderColumnsAsync(int userId, ReorderColumnsRequest request);
}
