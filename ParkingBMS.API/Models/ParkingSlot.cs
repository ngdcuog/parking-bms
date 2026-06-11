using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class ParkingSlot
    {
        public int SlotId { get; set; }
        public int FloorId { get; set; }
        public string SlotCode { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public SlotStatus Status { get; set; } = SlotStatus.Free;
        public byte[] RowVersion { get; set; } = null!;
        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual ParkingFloor Floor { get; set; } = null!;
        public virtual ICollection<ParkingSession> Sessions { get; set; } = new List<ParkingSession>();
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
