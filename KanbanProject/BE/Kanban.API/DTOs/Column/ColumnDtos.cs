using Kanban.API.DTOs.Card;

namespace Kanban.API.DTOs.Column;

public record BoardColumnDto(int Id, int BoardId, string Name, int Position, int? WipLimit, bool IsDone, List<CardDto> Cards);

public record CreateColumnRequest(string Name, int? Position, int? WipLimit, bool? IsDone);

public record UpdateColumnRequest(string Name, int Position, int? WipLimit, bool? IsDone);

public record ReorderColumnItem(int ColumnId, int Position);

public record ReorderColumnsRequest(List<ReorderColumnItem> Columns);
