using System;
using System.Threading.Tasks;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface IFeeCalculationService
    {
        Task<FeeCalculationResult> CalculateFeeAsync(DateTime checkIn, DateTime checkOut, VehicleType vehicleType, bool isLostTicket);
    }

    public class FeeCalculationResult
    {
        public decimal BaseFee { get; set; }
        public decimal PenaltyFee { get; set; }
        public decimal TotalFee { get; set; }
        public int DurationMinutes { get; set; }
        public bool IsOverstay { get; set; }
        public bool IsLostTicket { get; set; }
    }
}
