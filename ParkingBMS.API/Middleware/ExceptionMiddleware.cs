using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.Helpers;

namespace ParkingBMS.API.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred.");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            
            var response = new ApiResponse<object>
            {
                Success = false,
                Data = null
            };

            if (exception is ParkingException parkingEx)
            {
                context.Response.StatusCode = parkingEx.StatusCode;
                response.Message = parkingEx.Message;
                response.ErrorCode = parkingEx.ErrorCode;
            }
            else
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                response.Message = "An unexpected error occurred. Please try again later.";
                response.ErrorCode = "INTERNAL_ERROR";
            }

            var json = JsonSerializer.Serialize(response, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
            
            return context.Response.WriteAsync(json);
        }
    }
}
