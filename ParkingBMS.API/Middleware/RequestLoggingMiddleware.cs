using System.Diagnostics;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace ParkingBMS.API.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();
            
            var request = context.Request;
            _logger.LogInformation("HTTP Request: {Method} {Path}{QueryString}", 
                request.Method, request.Path, request.QueryString);

            await _next(context);

            stopwatch.Stop();
            _logger.LogInformation("HTTP Response: {StatusCode} (took {Elapsed}ms)", 
                context.Response.StatusCode, stopwatch.ElapsedMilliseconds);
        }
    }
}
