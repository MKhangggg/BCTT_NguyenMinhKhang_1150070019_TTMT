using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Kanban.API.Data;
using Kanban.API.IntegrationTests.Infrastructure;
using Kanban.API.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Kanban.API.IntegrationTests;

public class ApiErrorContractTests
{
    [Fact]
    public async Task Unauthorized_MissingToken_ReturnsApiErrorResponse()
    {
        using var factory = new KanbanApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        await AssertApiErrorAsync(response, HttpStatusCode.Unauthorized, "unauthorized");
    }

    [Fact]
    public async Task Forbidden_NonAdminCannotAccessAdminEndpoint_ReturnsApiErrorResponse()
    {
        using var factory = new KanbanApiFactory();
        using var client = factory.CreateClient();
        var token = await RegisterAndGetTokenAsync(client, "nonadmin");

        var response = await SendAuthorizedAsync(client, HttpMethod.Get, "/api/admin/overview", token);

        await AssertApiErrorAsync(response, HttpStatusCode.Forbidden, "forbidden");
    }

    [Fact]
    public async Task Forbidden_NonMemberCannotAccessPrivateBoard_ReturnsApiErrorResponse()
    {
        using var factory = new KanbanApiFactory();
        using var client = factory.CreateClient();

        var owner = await RegisterAndGetAuthAsync(client, "owner");
        var outsiderToken = await RegisterAndGetTokenAsync(client, "outsider");
        var boardId = await CreatePrivateBoardInDbAsync(factory, owner.UserId);

        var response = await SendAuthorizedAsync(client, HttpMethod.Get, $"/api/boards/{boardId}", outsiderToken);

        await AssertApiErrorAsync(response, HttpStatusCode.Forbidden, "forbidden");
    }

    [Fact]
    public async Task NotFound_CommentDoesNotExist_ReturnsApiErrorResponse()
    {
        using var factory = new KanbanApiFactory();
        using var client = factory.CreateClient();
        var token = await RegisterAndGetTokenAsync(client, "commenter");

        var response = await SendAuthorizedAsync(client, HttpMethod.Delete, "/api/comments/999999", token);

        await AssertApiErrorAsync(response, HttpStatusCode.NotFound, "not_found");
    }

    private static async Task<string> RegisterAndGetTokenAsync(HttpClient client, string alias)
    {
        var auth = await RegisterAndGetAuthAsync(client, alias);
        return auth.Token;
    }

    private static async Task<TestAuth> RegisterAndGetAuthAsync(HttpClient client, string alias)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var payload = new
        {
            fullName = $"Test User {alias}",
            userName = $"{alias}{suffix}",
            email = $"{alias}.{suffix}@example.com",
            password = "secret123"
        };

        var response = await client.PostAsJsonAsync("/api/auth/register", payload);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Register failed with {(int)response.StatusCode}: {body}");
        }

        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var token = json.RootElement.GetProperty("token").GetString();
        var userId = json.RootElement.GetProperty("user").GetProperty("id").GetInt32();
        return new TestAuth(token ?? throw new InvalidOperationException("Token was not returned by /api/auth/register."), userId);
    }

    private static async Task<int> CreatePrivateBoardInDbAsync(KanbanApiFactory factory, int ownerId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var board = new Board
        {
            Name = "Integration Test Board",
            Description = "Board for permission tests",
            OwnerId = ownerId,
            IsPublic = false
        };
        board.Members.Add(new BoardMember { UserId = ownerId, Role = BoardRole.Owner });
        db.Boards.Add(board);
        await db.SaveChangesAsync();
        return board.Id;
    }

    private sealed record TestAuth(string Token, int UserId);

    private static async Task<HttpResponseMessage> SendAuthorizedAsync(
        HttpClient client,
        HttpMethod method,
        string path,
        string token,
        object? payload = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload);
        }

        return await client.SendAsync(request);
    }

    private static async Task AssertApiErrorAsync(
        HttpResponseMessage response,
        HttpStatusCode expectedStatus,
        string expectedCode)
    {
        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("X-Request-Id", out var requestIdValues));

        var headerRequestId = requestIdValues?.SingleOrDefault();
        Assert.False(string.IsNullOrWhiteSpace(headerRequestId));

        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = json.RootElement;

        Assert.Equal(expectedCode, root.GetProperty("code").GetString());
        Assert.Equal((int)expectedStatus, root.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("message").GetString()));

        var bodyRequestId = root.GetProperty("requestId").GetString();
        Assert.False(string.IsNullOrWhiteSpace(bodyRequestId));
        Assert.Equal(headerRequestId, bodyRequestId);
        Assert.True(root.TryGetProperty("timestampUtc", out _));
    }
}
