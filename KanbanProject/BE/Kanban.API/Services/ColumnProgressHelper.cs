using System.Globalization;
using System.Text;
using Kanban.API.Models;

namespace Kanban.API.Services;

public static class ColumnProgressHelper
{
    public static bool IsCompletedColumn(BoardColumn column)
    {
        return column.IsDone;
    }

    public static bool IsInProgressColumn(BoardColumn column)
    {
        return !IsCompletedColumn(column) && IsInProgressColumnName(column.Name);
    }

    public static bool IsCompletedColumnName(string columnName)
    {
        var normalized = Normalize(columnName);
        return HasAny(normalized, "done", "complete", "completed", "finished", "finish", "xong", "hoan thanh", "da xong", "da hoan thanh");
    }

    private static bool IsInProgressColumnName(string columnName)
    {
        var normalized = Normalize(columnName);
        return HasAny(normalized, "progress", "in progress", "doing", "dang lam", "dang thuc hien");
    }

    private static bool HasAny(string value, params string[] tokens)
    {
        return tokens.Any(value.Contains);
    }

    private static string Normalize(string value)
    {
        var decomposed = (value ?? string.Empty).Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);

        foreach (var rawChar in decomposed)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(rawChar);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var current = rawChar is '\u0111' or '\u0110' ? 'd' : char.ToLowerInvariant(rawChar);
            builder.Append(char.IsLetterOrDigit(current) ? current : ' ');
        }

        return string.Join(' ', builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
