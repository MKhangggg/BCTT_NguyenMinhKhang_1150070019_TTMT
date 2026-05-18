using Kanban.API.Models;

namespace Kanban.API.DTOs.Report;

public record ColumnCountDto(int ColumnId, string ColumnName, int Count);

public record PriorityCountDto(CardPriority Priority, int Count);

public record BoardReportDto(
    int BoardId,
    int TotalCards,
    int CompletedCards,
    int InProgressCards,
    int OverdueCards,
    List<ColumnCountDto> CardsByColumn,
    List<PriorityCountDto> CardsByPriority);
