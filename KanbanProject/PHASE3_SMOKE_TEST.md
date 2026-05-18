# Phase 3 Smoke Test Checklist

## Prerequisites

- Start backend API (`KanbanProject/BE/Kanban.API`) with a valid SQL Server connection string.
- Start frontend app (`KanbanProject/FE/kanban-client`) and confirm it points to the API base URL.
- Keep browser devtools open (Network tab) to inspect response body and `X-Request-Id` header.

## API Contract Checks (Auth/Permission)

- [x] Unauthenticated call to `GET /api/auth/me` returns `401`.
  - Body contains `code = unauthorized`, `message`, `status = 401`, `requestId`, `timestampUtc`.
  - Response header contains `X-Request-Id` and it matches body `requestId`.

- [x] Non-admin user calls `GET /api/admin/overview` and gets `403`.
  - Body contains `code = forbidden`, `status = 403`, and non-empty `requestId`.

- [x] User who is not board member calls `GET /api/boards/{id}` for a private board and gets `403`.
  - Body contains `code = forbidden`, `status = 403`.

- [x] Delete non-existent comment `DELETE /api/comments/{missingId}` returns `404`.
  - Body contains `code = not_found`, `status = 404`.

## Frontend Error Handling Checks

- [x] Login page shows backend error message on invalid credentials.
- [x] If backend includes `requestId`, UI error text appends `(requestId: ...)`.
- [x] Token expiry during an authenticated API call logs user out and redirects to `/login?expired=1`.
- [x] After redirect, login page shows session-expired message once.

## Verification Notes

- API contract checks are covered by `ApiErrorContractTests` and pass with `dotnet test KanbanProject/BE/Kanban.API.IntegrationTests/Kanban.API.IntegrationTests.csproj`.
- Frontend error-handling checks are verified against implementation in:
  - `KanbanProject/FE/kanban-client/src/services/api.js`
  - `KanbanProject/FE/kanban-client/src/pages/auth/LoginPage.jsx`
  - `KanbanProject/FE/kanban-client/src/context/AuthContext.jsx`

## Recommended Quick Commands

```bash
# Backend integration tests
dotnet test KanbanProject/BE/Kanban.API.IntegrationTests/Kanban.API.IntegrationTests.csproj

# Full .NET solution build/test
dotnet build BCTT_NguyenMinhKhang_1150070019_TTMT.sln
dotnet test BCTT_NguyenMinhKhang_1150070019_TTMT.sln
```