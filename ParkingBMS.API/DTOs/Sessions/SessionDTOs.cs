using System;
using System.Collections.Generic;
using ParkingBMS.API.Enums;
using ParkingBMS.API.DTOs.Payments;
using ParkingBMS.API.DTOs.Exceptions;

namespace ParkingBMS.API.DTOs.Sessions
{
    public class CheckInRequest
    {
        public string LicensePlate { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public string? Note { get; set; }
    }

    public class CheckOutRequest
    {
        public string QRCode { get; set; } = null!;
        public PaymentMethod PaymentMethod { get; set; }
    }

    public class CheckoutByPlateRequest
    {
        public string LicensePlate { get; set; } = null!;
    }

    public class CheckoutConfirmRequest
    {
        public PaymentMethod PaymentMethod { get; set; }
        public bool IsLostTicket { get; set; }
    }

    public class CheckInResponseDTO
    {
        public Guid SessionId { get; set; }
        public int SlotId { get; set; }
        public string SlotCode { get; set; } = null!;
        public string FloorName { get; set; } = null!;
        public short FloorNumber { get; set; }
        public string? BuildingName { get; set; }
        public string LicensePlate { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public DateTime CheckInTime { get; set; }
        public string QRCode { get; set; } = null!;
        public SessionType SessionType { get; set; }
        public bool AllocatedByAI { get; set; }
        public string? Note { get; set; } // can contain AI score details
    }

    public class CheckOutResponseDTO
    {
        public Guid SessionId { get; set; }
        public string LicensePlate { get; set; } = null!;
        public string SlotCode { get; set; } = null!;
        public string FloorName { get; set; } = null!;
        public string? BuildingName { get; set; }
        public VehicleType VehicleType { get; set; }
        public SessionType SessionType { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime CheckOutTime { get; set; }
        public int DurationMinutes { get; set; }
        public decimal BaseFee { get; set; }
        public decimal PenaltyFee { get; set; }
        public decimal TotalFee { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public bool IsOverstay { get; set; }
        public bool IsLostTicket { get; set; }
    }

    public class SessionSummaryDTO
    {
        public Guid SessionId { get; set; }
        public string LicensePlate { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public string SlotCode { get; set; } = null!;
        public string FloorName { get; set; } = null!;
        public string? BuildingName { get; set; }
        public DateTime CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int? DurationMinutes { get; set; }
        public decimal? Fee { get; set; }
        public SessionStatus Status { get; set; }
        public SessionType SessionType { get; set; }
    }

    public class SessionDetailDTO : SessionSummaryDTO
    {
        public int? UserId { get; set; }
        public int? BookingId { get; set; }
        public string CheckInByStaffName { get; set; } = null!;
        public string? CheckOutByStaffName { get; set; }
        public string? Note { get; set; }
        public PaymentDTO? Payment { get; set; }
        public List<ExceptionLogDTO> ExceptionLogs { get; set; } = new List<ExceptionLogDTO>();
    }

    public class UpdateLicensePlateRequest
    {
        public string NewLicensePlate { get; set; } = null!;
        public string Reason { get; set; } = null!;
    }

    public class UpdateSlotRequest
    {
        public int NewSlotId { get; set; }
        public string Reason { get; set; } = null!;
    }

    public class CurrentFeeResponseDTO
    {
        public Guid SessionId { get; set; }
        public int DurationMinutes { get; set; }
        public decimal EstimatedFee { get; set; }
        public bool IsOverstay { get; set; }
    }
}
