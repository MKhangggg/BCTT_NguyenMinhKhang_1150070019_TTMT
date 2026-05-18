namespace Kanban.API.Models;

public class CardLabel
{
    public int Id { get; set; }
    public int CardId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#64748b";

    public Card Card { get; set; } = null!;
}
