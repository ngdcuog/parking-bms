using System;
using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class Booking
    {
        public int BookingId { get; set; }
        public int UserId { get; set; }
        public int SlotId { get; set; }
        public VehicleType VehicleType { get; set; }
        public string? LicensePlate { get; set; }
        public DateTime PlannedCheckIn { get; set; }
        public DateTime PlannedCheckOut { get; set; }
        public string QRCode { get; set; } = null!;
        public BookingStatus Status { get; set; } = BookingStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiredAt { get; set; }

        // Navigation properties
        public virtual AppUser User { get; set; } = null!;
        public virtual ParkingSlot Slot { get; set; } = null!;
        public virtual ICollection<ParkingSession> Sessions { get; set; } = new List<ParkingSession>();
    }
}
