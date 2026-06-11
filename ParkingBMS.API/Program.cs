using System;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ParkingBMS.API.BackgroundJobs;
using ParkingBMS.API.Data;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Mapping;
using ParkingBMS.API.Middleware;
using ParkingBMS.API.Repositories.Implementations;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Implementations;
using ParkingBMS.API.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình DbContext sử dụng SQL Server LocalDB
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Đăng ký AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

// 3. Đăng ký các Helpers
builder.Services.AddScoped<JwtHelper>();

// 4. Đăng ký Generic Repository
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// 5. Đăng ký các Dịch vụ Nghiệp vụ (Business Services)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IBuildingService, BuildingService>();
builder.Services.AddScoped<ISlotService, SlotService>();
builder.Services.AddScoped<ITariffService, TariffService>();
builder.Services.AddScoped<IFeeCalculationService, FeeCalculationService>();
builder.Services.AddScoped<ISlotAllocationService, SlotAllocationService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IReportService, ReportService>();

// 6. Đăng ký Background Job
builder.Services.AddHostedService<BookingExpirationJob>();

// 7. Cấu hình JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret Key is not configured.");
var key = Encoding.UTF8.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Dev environment
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 8. Cấu hình CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                     ?? new[] { "http://localhost:5173" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Bắt buộc cho HttpOnly Cookie
    });
});

// 9. Cấu hình Controllers và tuần tự hóa Json (Enum -> String)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Tuần tự hóa Enum thành tên dạng text trong JSON, dễ debug trên client
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// 10. Cấu hình Swagger kèm Authorization Header
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Parking Building Management System API", Version = "v1" });

    // JWT Security Definition
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token JWT theo định dạng: Bearer {your_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
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

// 11. Cấu hình HTTP Pipeline

// Sử dụng Global Exception Handler Middleware
app.UseMiddleware<ExceptionMiddleware>();

// Sử dụng Request Logging Middleware
app.UseMiddleware<RequestLoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// 12. Tự động Migration và Seed Dữ liệu khi khởi chạy ứng dụng
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Chạy migration
        context.Database.Migrate();
        // Seed data
        DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Đã xảy ra lỗi trong quá trình tự động cập nhật Database và Seed dữ liệu.");
    }
}

app.Run();
