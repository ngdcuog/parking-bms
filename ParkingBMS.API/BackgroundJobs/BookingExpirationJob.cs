using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ParkingBMS.API.Data;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.BackgroundJobs
{
    public class BookingExpirationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingExpirationJob> _logger;

        public BookingExpirationJob(IServiceScopeFactory scopeFactory, ILogger<BookingExpirationJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Booking Expiration Job is starting.");
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
            
            while (await timer.WaitForNextTickAsync(stoppingToken) && !stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    
                    var now = DateTime.UtcNow;
                    
                    // Fetch bookings that are still pending and past their expiration time
                    var expiredBookings = await dbContext.Bookings
                        .Include(b => b.Slot)
                        .Where(b => b.Status == BookingStatus.Pending && b.ExpiredAt < now)
                        .ToListAsync(stoppingToken);

                    if (expiredBookings.Any())
                    {
                        _logger.LogInformation("Found {Count} expired bookings. Cancelling...", expiredBookings.Count);
                        
                        foreach (var booking in expiredBookings)
                        {
                            booking.Status = BookingStatus.Expired;
                            if (booking.Slot.Status == SlotStatus.Reserved)
                            {
                                booking.Slot.Status = SlotStatus.Free;
                            }
                        }
                        
                        await dbContext.SaveChangesAsync(stoppingToken);
                        _logger.LogInformation("Expired bookings cancelled successfully.");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred during BookingExpirationJob execution.");
                }
            }
        }
    }
}
