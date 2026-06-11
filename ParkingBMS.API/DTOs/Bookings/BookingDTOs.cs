using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Bookings
{
    public class CreateBookingRequest
    {
        public VehicleType VehicleType { get; set; }
        public DateTime PlannedCheckIn { get; set; }
        public DateTime PlannedCheckOut { get; set; }
        public string? LicensePlate { get; set; }
        public int? BuildingId { get; set; }
    }

    public class BookingDTO
    {
        public int BookingId { get; set; }
        public int UserId { get; set; }
        public string UserFullName { get; set; } = null!;
        public int SlotId { get; set; }
        public string SlotCode { get; set; } = null!;
        public string FloorName { get; set; } = null!;
        public int BuildingId { get; set; }
        public string BuildingName { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public string? LicensePlate { get; set; }
        public DateTime PlannedCheckIn { get; set; }
        public DateTime PlannedCheckOut { get; set; }
        public string QRCode { get; set; } = null!;
        public BookingStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiredAt { get; set; }
    }

    public class BookingDetailDTO : BookingDTO
    {
        // inherits everything, can be extended if needed
    }
}
