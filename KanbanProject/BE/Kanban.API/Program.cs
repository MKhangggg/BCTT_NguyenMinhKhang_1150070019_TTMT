using System.Text;
using System.Text.Json.Serialization;
using Kanban.API.Common;
using Kanban.API.Data;
using Kanban.API.Helpers;
using Kanban.API.Hubs;
using Kanban.API.Interfaces;
using Kanban.API.Middlewares;
using Kanban.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
if (corsOrigins.Length == 0)
{
    throw new InvalidOperationException("Cors:AllowedOrigins phải có ít nhất một origin.");
}

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Thiếu cấu hình Jwt:Key.");
if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key phải có ít nhất 32 ký tự.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Thiếu cấu hình Jwt:Issuer.");
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Thiếu cấu hình Jwt:Audience.");
if (!int.TryParse(builder.Configuration["Jwt:ExpiresInMinutes"], out var jwtExpiresInMinutes) || jwtExpiresInMinutes <= 0)
{
    throw new InvalidOperationException("Jwt:ExpiresInMinutes phải là số nguyên dương.");
}

var autoMigrateOnStartup = builder.Configuration.GetValue("DatabaseStartup:AutoMigrate", builder.Environment.IsDevelopment());
var autoSeedOnStartup = builder.Configuration.GetValue("DatabaseStartup:AutoSeed", builder.Environment.IsDevelopment());

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray());

        var response = new ApiErrorResponse
        {
            Code = ApiErrorCodes.ValidationFailed,
            Message = "Dữ liệu gửi lên không hợp lệ.",
            Status = StatusCodes.Status400BadRequest,
            RequestId = context.HttpContext.TraceIdentifier,
            Errors = errors
        };

        context.HttpContext.Response.Headers["X-Request-Id"] = context.HttpContext.TraceIdentifier;
        return new BadRequestObjectResult(response);
    };
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHealthChecks();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactClient", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSignalR();

builder.Services.AddScoped<JwtHelper>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<IBoardService, BoardService>();
builder.Services.AddScoped<IColumnService, ColumnService>();
builder.Services.AddScoped<ICardService, CardService>();
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IReportService, ReportService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                if (context.Response.HasStarted)
                {
                    return;
                }

                var requestId = context.HttpContext.TraceIdentifier;
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                context.Response.Headers["X-Request-Id"] = requestId;

                var payload = new ApiErrorResponse
                {
                    Code = ApiErrorCodes.Unauthorized,
                    Message = "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.",
                    Status = StatusCodes.Status401Unauthorized,
                    RequestId = requestId
                };

                await context.Response.WriteAsJsonAsync(payload);
            },
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/board"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnForbidden = async context =>
            {
                if (context.Response.HasStarted)
                {
                    return;
                }

                var requestId = context.HttpContext.TraceIdentifier;
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                context.Response.Headers["X-Request-Id"] = requestId;

                var payload = new ApiErrorResponse
                {
                    Code = ApiErrorCodes.Forbidden,
                    Message = "Bạn không có quyền truy cập tài nguyên này.",
                    Status = StatusCodes.Status403Forbidden,
                    RequestId = requestId
                };

                await context.Response.WriteAsJsonAsync(payload);
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "API Kanban", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT token dạng: Bearer {token}"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Request-Id"] = context.TraceIdentifier;
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseCors("ReactClient");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", async (AppDbContext dbContext, CancellationToken cancellationToken) =>
{
    var databaseHealthy = await dbContext.Database.CanConnectAsync(cancellationToken);
    var status = databaseHealthy ? "Hoạt động" : "Suy giảm";

    return Results.Json(new
    {
        status,
        checks = new
        {
            api = "Hoạt động",
            database = databaseHealthy ? "Hoạt động" : "Không khả dụng"
        },
        timestampUtc = DateTimeOffset.UtcNow
    }, statusCode: databaseHealthy ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable);
}).AllowAnonymous();

app.MapControllers();
app.MapHub<BoardHub>("/hubs/board");

if (autoMigrateOnStartup || autoSeedOnStartup)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (autoMigrateOnStartup)
        {
            await db.Database.MigrateAsync();
        }

        if (autoSeedOnStartup)
        {
            await SeedData.InitializeAsync(db);
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Không thể migrate/seed database tự động. Hãy kiểm tra SQL Server hoặc chạy dotnet ef database update.");
    }
}
else
{
    app.Logger.LogInformation("Tự động migrate/seed database đã bị tắt trong cấu hình.");
}

app.Run();

public partial class Program;
