using System;
using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class ParkingSession
    {
        public Guid SessionId { get; set; } = Guid.NewGuid();
        public int SlotId { get; set; }
        public int? UserId { get; set; }
        public int? BookingId { get; set; }
        public string LicensePlate { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public DateTime CheckInTime { get; set; } = DateTime.UtcNow;
        public DateTime? CheckOutTime { get; set; }
        public decimal? Fee { get; set; }
        public string QRCode { get; set; } = null!;
        public SessionType SessionType { get; set; } = SessionType.WalkIn;
        public SessionStatus Status { get; set; } = SessionStatus.Active;
        public int CheckInByStaffId { get; set; }
        public int? CheckOutByStaffId { get; set; }
        public string? Note { get; set; }

        // Navigation properties
        public virtual ParkingSlot Slot { get; set; } = null!;
        public virtual AppUser? User { get; set; }
        public virtual Booking? Booking { get; set; }
        public virtual AppUser CheckInStaff { get; set; } = null!;
        public virtual AppUser? CheckOutStaff { get; set; }
        public virtual Payment? Payment { get; set; }
        public virtual ICollection<ExceptionLog> ExceptionLogs { get; set; } = new List<ExceptionLog>();
    }
}
