using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class FeeCalculationService : IFeeCalculationService
    {
        private readonly IRepository<TariffConfig> _tariffRepository;

        public FeeCalculationService(IRepository<TariffConfig> tariffRepository)
        {
            _tariffRepository = tariffRepository;
        }

        public async Task<FeeCalculationResult> CalculateFeeAsync(DateTime checkIn, DateTime checkOut, VehicleType vehicleType, bool isLostTicket)
        {
            if (checkOut < checkIn)
            {
                throw new ParkingException("VALIDATION_ERROR", "Thời gian checkout không thể trước thời gian checkin.", 400);
            }

            // Fetch active tariff config
            var tariff = (await _tariffRepository.FindAsync(t => 
                    t.IsActive && 
                    t.VehicleType == vehicleType && 
                    t.EffectiveFrom <= checkOut))
                .OrderByDescending(t => t.EffectiveFrom)
                .FirstOrDefault();

            if (tariff == null)
            {
                throw new ParkingException("TARIFF_NOT_FOUND", $"Không tìm thấy bảng giá hoạt động cho loại xe {vehicleType}.", 404);
            }

            var totalMinutes = (checkOut - checkIn).TotalMinutes;
            if (totalMinutes < 0) totalMinutes = 0;
            int durationHours = (int)Math.Ceiling(totalMinutes / 60.0);

            // Vietnamese parking lot logic:
            // - Day Shift (06:00 - 18:00): PricePerHour (Day flat rate)
            // - Night Shift (18:00 - 06:00 next day): PricePerHour * PeakHourRate (Night flat rate)
            // - Overnight (crossing 02:00 AM): DailyMaxFee (Overnight flat rate)
            decimal dayRate = tariff.PricePerHour;
            decimal nightRate = tariff.PricePerHour * tariff.PeakHourRate;
            decimal overnightFee = tariff.DailyMaxFee ?? (vehicleType == VehicleType.Motorbike ? 50000m : (vehicleType == VehicleType.Car ? 200000m : 300000m));

            int overnightMilestones = 0;
            DateTime currentMilestoneDate = checkIn.Date;
            DateTime endMilestoneDate = checkOut.Date.AddDays(1);

            for (DateTime date = currentMilestoneDate; date <= endMilestoneDate; date = date.AddDays(1))
            {
                DateTime milestoneTime = date.AddHours(2); // 02:00 AM milestone
                if (checkIn < milestoneTime && milestoneTime < checkOut)
                {
                    overnightMilestones++;
                }
            }

            decimal baseFee = 0;

            if (overnightMilestones > 0)
            {
                // Charge overnight fee for each crossing
                baseFee += overnightMilestones * overnightFee;

                // Plus any remaining time after the last milestone
                DateTime lastMilestone = checkIn.Date.AddDays(overnightMilestones).AddHours(2);
                if (lastMilestone < checkIn)
                {
                    lastMilestone = checkIn;
                }

                if (checkOut > lastMilestone)
                {
                    baseFee += CalculateSameDayFee(lastMilestone, checkOut, dayRate, nightRate);
                }
            }
            else
            {
                // No overnight crossings, just normal shift rates
                baseFee = CalculateSameDayFee(checkIn, checkOut, dayRate, nightRate);
            }

            // Check Lost Ticket
            decimal penaltyFee = 0;
            if (isLostTicket)
            {
                penaltyFee += tariff.LostTicketFee;
            }

            // Total fee calculation and round to nearest 1,000 VNĐ
            decimal totalFeeRaw = baseFee + penaltyFee;
            decimal totalFeeRounded = Math.Round(totalFeeRaw / 1000m, MidpointRounding.AwayFromZero) * 1000m;

            bool isOverstay = tariff.OvertimeHourThreshold.HasValue && durationHours > tariff.OvertimeHourThreshold.Value;

            return new FeeCalculationResult
            {
                BaseFee = baseFee,
                PenaltyFee = penaltyFee,
                TotalFee = totalFeeRounded,
                DurationMinutes = (int)Math.Round(totalMinutes),
                IsOverstay = isOverstay,
                IsLostTicket = isLostTicket
            };
        }

        private decimal CalculateSameDayFee(DateTime start, DateTime end, decimal dayRate, decimal nightRate)
        {
            bool hasDay = false;
            bool hasNight = false;

            var startDate = start.Date;
            var endDate = end.Date;

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                // Day shift: 06:00 - 18:00
                DateTime dayStart = date.AddHours(6);
                DateTime dayEnd = date.AddHours(18);

                if (Math.Max(start.Ticks, dayStart.Ticks) < Math.Min(end.Ticks, dayEnd.Ticks))
                {
                    hasDay = true;
                }

                // Night shift part 1: 00:00 - 06:00
                DateTime nightStart1 = date;
                DateTime nightEnd1 = date.AddHours(6);
                if (Math.Max(start.Ticks, nightStart1.Ticks) < Math.Min(end.Ticks, nightEnd1.Ticks))
                {
                    hasNight = true;
                }

                // Night shift part 2: 18:00 - 24:00
                DateTime nightStart2 = date.AddHours(18);
                DateTime nightEnd2 = date.AddDays(1);
                if (Math.Max(start.Ticks, nightStart2.Ticks) < Math.Min(end.Ticks, nightEnd2.Ticks))
                {
                    hasNight = true;
                }
            }

            decimal fee = 0;
            if (hasDay) fee += dayRate;
            if (hasNight) fee += nightRate;

            if (!hasDay && !hasNight && end > start)
            {
                fee = dayRate;
            }

            return fee;
        }
    }
}
