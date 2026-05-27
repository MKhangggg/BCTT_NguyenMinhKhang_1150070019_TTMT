using System.ComponentModel.DataAnnotations;
using Kanban.API.DTOs.Column;
using Kanban.API.DTOs.Member;

namespace Kanban.API.DTOs.Board;

public record ProjectDocumentDto(int Id, int BoardId, string Title, string? Description, string Url, DateTime CreatedAt);

public record BoardSummaryDto(
    int Id,
    string? ProjectCode,
    string Name,
    string? Description,
    string? Summary,
    int OwnerId,
    int? OrganizationUnitId,
    string? OrganizationUnitCode,
    string? OrganizationUnitName,
    string? OrganizationUnitType,
    bool IsPublic,
    int MemberCount,
    int DocumentCount,
    int TotalCards,
    int CompletedCards,
    int RemainingCards,
    int OverdueCards,
    int ProgressPercent,
    string ProgressStatus,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record BoardDetailDto(
    int Id,
    string? ProjectCode,
    string Name,
    string? Description,
    string? Summary,
    int OwnerId,
    int? OrganizationUnitId,
    string? OrganizationUnitCode,
    string? OrganizationUnitName,
    string? OrganizationUnitType,
    bool IsPublic,
    int TotalCards,
    int CompletedCards,
    int RemainingCards,
    int OverdueCards,
    int ProgressPercent,
    string ProgressStatus,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<ProjectDocumentDto> Documents,
    List<BoardMemberDto> Members,
    List<BoardColumnDto> Columns);

public record CreateBoardRequest(
    [StringLength(40, ErrorMessage = "Mã dự án không được vượt quá 40 ký tự.")]
    string? ProjectCode,
    [Required(ErrorMessage = "Tên dự án là bắt buộc.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Tên dự án phải có từ 2 đến 120 ký tự.")]
    string Name,
    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    string? Description,
    [StringLength(2000, ErrorMessage = "Tóm tắt dự án không được vượt quá 2000 ký tự.")]
    string? Summary,
    int? OrganizationUnitId,
    bool IsPublic);

public record UpdateBoardRequest(
    [StringLength(40, ErrorMessage = "Mã dự án không được vượt quá 40 ký tự.")]
    string? ProjectCode,
    [Required(ErrorMessage = "Tên dự án là bắt buộc.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Tên dự án phải có từ 2 đến 120 ký tự.")]
    string Name,
    [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
    string? Description,
    [StringLength(2000, ErrorMessage = "Tóm tắt dự án không được vượt quá 2000 ký tự.")]
    string? Summary,
    int? OrganizationUnitId,
    bool IsPublic);

public record CreateProjectDocumentRequest(
    [Required(ErrorMessage = "Tên tài liệu là bắt buộc.")]
    [StringLength(180, MinimumLength = 2, ErrorMessage = "Tên tài liệu phải có từ 2 đến 180 ký tự.")]
    string Title,
    [StringLength(500, ErrorMessage = "Mô tả tài liệu không được vượt quá 500 ký tự.")]
    string? Description,
    [Required(ErrorMessage = "Liên kết tài liệu là bắt buộc.")]
    [StringLength(1000, ErrorMessage = "Liên kết tài liệu không được vượt quá 1000 ký tự.")]
    string Url);
