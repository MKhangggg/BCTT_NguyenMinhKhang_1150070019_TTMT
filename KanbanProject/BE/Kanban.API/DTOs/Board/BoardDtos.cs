using System.ComponentModel.DataAnnotations;
using Kanban.API.DTOs.Column;
using Kanban.API.DTOs.Member;

namespace Kanban.API.DTOs.Board;

public record BoardSummaryDto(int Id, string Name, string? Description, int OwnerId, bool IsPublic, int MemberCount, DateTime CreatedAt, DateTime? UpdatedAt);

public record BoardDetailDto(
    int Id,
    string Name,
    string? Description,
    int OwnerId,
    bool IsPublic,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<BoardMemberDto> Members,
    List<BoardColumnDto> Columns);

public record CreateBoardRequest(
    [Required(ErrorMessage = "Tên board là bắt buộc.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Tên board phải có từ 2 đến 120 ký tự.")]
    string Name,
    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    string? Description,
    bool IsPublic);

public record UpdateBoardRequest(
    [Required(ErrorMessage = "Tên board là bắt buộc.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Tên board phải có từ 2 đến 120 ký tự.")]
    string Name,
    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    string? Description,
    bool IsPublic);
