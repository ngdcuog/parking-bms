using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Data;
using ParkingBMS.API.DTOs.Reports;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Models;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class ReportService : IReportService
    {
        private readonly AppDbContext _context;

        public ReportService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardSummaryDTO> GetDashboardSummaryAsync()
        {
            // UTC range matching today in Vietnam (UTC+7)
            var localTodayStart = DateTime.UtcNow.AddHours(7).Date.AddHours(-7);
            var localTodayEnd = localTodayStart.AddDays(1);

            // Today's revenue
            var todayRevenue = await _context.Payments
                .Where(p => p.PaidAt >= localTodayStart && p.PaidAt < localTodayEnd)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            // Today's sessions (closed session checkouts today or checkins today)
            var todaySessions = await _context.ParkingSessions
                .CountAsync(s => s.CheckInTime >= localTodayStart && s.CheckInTime < localTodayEnd);

            // Load active slots
            var activeSlots = await _context.ParkingSlots
                .Include(s => s.Floor)
                .Where(s => s.IsActive && s.Floor.IsActive)
                .ToListAsync();

            int totalFree = activeSlots.Count(s => s.Status == SlotStatus.Free);
            int totalOccupied = activeSlots.Count(s => s.Status == SlotStatus.Occupied);
            int totalReserved = activeSlots.Count(s => s.Status == SlotStatus.Reserved);
            int totalActive = activeSlots.Count;

            decimal occupancyPercent = totalActive > 0 
                ? (decimal)(totalOccupied + totalReserved) / totalActive * 100 
                : 0m;

            // Revenue by vehicle type today
            var paymentsToday = await _context.Payments
                .Include(p => p.Session)
                .Where(p => p.PaidAt >= localTodayStart && p.PaidAt < localTodayEnd)
                .ToListAsync();

            var revenueByVehicleType = Enum.GetValues<VehicleType>()
                .Select(vt => new RevenueByVehicleTypeDTO
                {
                    VehicleType = vt,
                    Revenue = paymentsToday.Where(p => p.Session.VehicleType == vt).Sum(p => p.Amount)
                })
                .ToList();

            // Slots by floor
            var slotsByFloor = activeSlots
                .GroupBy(s => s.Floor)
                .Select(g => {
                    int free = g.Count(s => s.Status == SlotStatus.Free);
                    int occupied = g.Count(s => s.Status == SlotStatus.Occupied);
                    int reserved = g.Count(s => s.Status == SlotStatus.Reserved);
                    int maint = g.Count(s => s.Status == SlotStatus.Maintenance);
                    int locked = g.Count(s => s.Status == SlotStatus.Locked);
                    int total = g.Count();
                    
                    return new SlotsByFloorDTO
                    {
                        FloorId = g.Key.FloorId,
                        FloorName = g.Key.FloorName,
                        VehicleType = g.Key.VehicleType,
                        Free = free,
                        Occupied = occupied,
                        Reserved = reserved,
                        Maintenance = maint,
                        Locked = locked,
                        Total = total,
                        UtilizationPercent = total > 0 ? (decimal)(occupied + reserved) / total * 100 : 0
                    };
                })
                .OrderBy(f => f.FloorName)
                .ToList();

            return new DashboardSummaryDTO
            {
                TodayRevenue = todayRevenue,
                TodaySessions = todaySessions,
                CurrentOccupancyPercent = Math.Round(occupancyPercent, 2),
                TotalFreeSlots = totalFree,
                TotalOccupiedSlots = totalOccupied,
                TotalReservedSlots = totalReserved,
                RevenueByVehicleType = revenueByVehicleType,
                SlotsByFloor = slotsByFloor
            };
        }

        public async Task<IEnumerable<RevenueReportDTO>> GetRevenueReportAsync(DateTime dateFrom, DateTime dateTo, string groupBy, VehicleType? vehicleType)
        {
            var query = _context.Payments
                .Include(p => p.Session)
                .Where(p => p.PaidAt >= dateFrom && p.PaidAt <= dateTo);

            if (vehicleType.HasValue)
            {
                query = query.Where(p => p.Session.VehicleType == vehicleType.Value);
            }

            var payments = await query.ToListAsync();

            // Perform grouping in-memory with local timezone conversion (UTC+7)
            IEnumerable<IGrouping<string, Payment>> grouped;
            if (groupBy.ToLower() == "month")
            {
                grouped = payments.GroupBy(p => p.PaidAt.AddHours(7).ToString("yyyy-MM"));
            }
            else if (groupBy.ToLower() == "week")
            {
                grouped = payments.GroupBy(p => {
                    var localTime = p.PaidAt.AddHours(7);
                    int week = CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(localTime, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
                    return $"{localTime.Year}-W{week:D2}";
                });
            }
            else // default grouping is Day
            {
                grouped = payments.GroupBy(p => p.PaidAt.AddHours(7).ToString("yyyy-MM-dd"));
            }

            return grouped
                .Select(g => new RevenueReportDTO
                {
                    Period = g.Key,
                    TotalRevenue = g.Sum(p => p.Amount),
                    TotalSessions = g.Count(),
                    AvgFee = g.Count() > 0 ? Math.Round(g.Average(p => p.Amount), 2) : 0
                })
                .OrderBy(r => r.Period)
                .ToList();
        }

        public async Task<IEnumerable<HourlyTrafficDTO>> GetHourlyTrafficReportAsync(DateTime dateFrom, DateTime dateTo, VehicleType? vehicleType)
        {
            // Initializing 24 hours buckets (0 to 23) (BR-09.4)
            var trafficDict = Enumerable.Range(0, 24)
                .ToDictionary(h => h, h => new HourlyTrafficDTO { Hour = h, CheckInCount = 0, CheckOutCount = 0 });

            var sessionsQuery = _context.ParkingSessions
                .Where(s => s.CheckInTime >= dateFrom && s.CheckInTime <= dateTo);

            if (vehicleType.HasValue)
            {
                sessionsQuery = sessionsQuery.Where(s => s.VehicleType == vehicleType.Value);
            }

            var sessions = await sessionsQuery.ToListAsync();

            foreach (var s in sessions)
            {
                // CheckIn (UTC+7)
                int checkInHour = s.CheckInTime.AddHours(7).Hour;
                if (trafficDict.ContainsKey(checkInHour))
                {
                    trafficDict[checkInHour].CheckInCount++;
                }

                // CheckOut (UTC+7)
                if (s.CheckOutTime.HasValue && s.CheckOutTime.Value >= dateFrom && s.CheckOutTime.Value <= dateTo)
                {
                    int checkOutHour = s.CheckOutTime.Value.AddHours(7).Hour;
                    if (trafficDict.ContainsKey(checkOutHour))
                    {
                        trafficDict[checkOutHour].CheckOutCount++;
                    }
                }
            }

            return trafficDict.Values.OrderBy(t => t.Hour).ToList();
        }

        public async Task<IEnumerable<SlotUtilizationDTO>> GetSlotUtilizationReportAsync(DateTime dateFrom, DateTime dateTo, int? floorId)
        {
            // Utilization report logic (BR-09.3):
            // Retrieve floors
            var floorsQuery = _context.ParkingFloors.Include(f => f.Slots).Where(f => f.IsActive);
            if (floorId.HasValue)
            {
                floorsQuery = floorsQuery.Where(f => f.FloorId == floorId.Value);
            }
            var floors = await floorsQuery.ToListAsync();

            // Retrieve all sessions that were active at some point within this range
            var sessions = await _context.ParkingSessions
                .Include(s => s.Slot)
                .Where(s => s.CheckInTime <= dateTo && (s.CheckOutTime == null || s.CheckOutTime >= dateFrom))
                .ToListAsync();

            var result = new List<SlotUtilizationDTO>();

            foreach (var floor in floors)
            {
                int totalActiveSlots = floor.Slots.Count(s => s.IsActive);
                if (totalActiveSlots == 0) continue;

                // Simple estimation based on checkins
                var floorSessions = sessions.Where(s => s.Slot.FloorId == floor.FloorId).ToList();

                // Compute hourly utilization over the period
                double totalHoursInRange = (dateTo - dateFrom).TotalHours;
                if (totalHoursInRange <= 0) totalHoursInRange = 1;

                double totalOccupiedHours = 0;
                foreach (var s in floorSessions)
                {
                    var start = s.CheckInTime < dateFrom ? dateFrom : s.CheckInTime;
                    var end = (s.CheckOutTime == null || s.CheckOutTime > dateTo) ? dateTo : s.CheckOutTime.Value;
                    
                    var duration = (end - start).TotalHours;
                    if (duration > 0)
                    {
                        totalOccupiedHours += duration;
                    }
                }

                // Average utilization = totalOccupiedSlotHours / (totalActiveSlots * totalHoursInRange)
                double avgUtil = (totalOccupiedHours / (totalActiveSlots * totalHoursInRange)) * 100;
                if (avgUtil > 100) avgUtil = 100;

                // Peak utilization logic: group overlap slots
                // Let's estimate peak utilization as max overlap. An easy way is to scan hours and count.
                int peakCount = 0;
                int peakHour = 12; // default
                
                // Let's check traffic by hour to find the peak hour
                var hourlyCounts = new int[24];
                foreach (var s in floorSessions)
                {
                    int startHour = s.CheckInTime < dateFrom ? 0 : s.CheckInTime.AddHours(7).Hour;
                    int endHour = (s.CheckOutTime == null || s.CheckOutTime > dateTo) ? 23 : s.CheckOutTime.Value.AddHours(7).Hour;
                    
                    if (s.CheckOutTime == null || s.CheckOutTime.Value > s.CheckInTime)
                    {
                        for (int h = startHour; h <= endHour; h++)
                        {
                            hourlyCounts[h]++;
                        }
                    }
                }
                
                for (int h = 0; h < 24; h++)
                {
                    if (hourlyCounts[h] > peakCount)
                    {
                        peakCount = hourlyCounts[h];
                        peakHour = h;
                    }
                }

                double peakUtil = totalActiveSlots > 0 ? ((double)peakCount / totalActiveSlots) * 100 : 0;
                if (peakUtil > 100) peakUtil = 100;

                result.Add(new SlotUtilizationDTO
                {
                    FloorId = floor.FloorId,
                    FloorName = floor.FloorName,
                    VehicleType = floor.VehicleType,
                    AvgUtilizationPercent = Math.Round((decimal)avgUtil, 2),
                    PeakUtilizationPercent = Math.Round((decimal)peakUtil, 2),
                    PeakHour = peakHour
                });
            }

            return result;
        }

        public async Task<ExceptionsSummaryDTO> GetExceptionsSummaryAsync(DateTime dateFrom, DateTime dateTo)
        {
            var logs = await _context.ExceptionLogs
                .Where(e => e.CreatedAt >= dateFrom && e.CreatedAt <= dateTo)
                .ToListAsync();

            return new ExceptionsSummaryDTO
            {
                Total = logs.Count,
                LostTicket = logs.Count(l => l.ExceptionType == ExceptionType.LostTicket),
                WrongPlate = logs.Count(l => l.ExceptionType == ExceptionType.WrongPlate),
                Overstay = logs.Count(l => l.ExceptionType == ExceptionType.Overstay),
                WrongZone = logs.Count(l => l.ExceptionType == ExceptionType.WrongZone),
                Other = logs.Count(l => l.ExceptionType == ExceptionType.Other)
            };
        }
    }
}
