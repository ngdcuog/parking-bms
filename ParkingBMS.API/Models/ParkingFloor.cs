using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class ParkingFloor
    {
        public int FloorId { get; set; }
        public int BuildingId { get; set; }
        public string FloorName { get; set; } = null!;
        public short FloorNumber { get; set; }
        public VehicleType VehicleType { get; set; }
        public short TotalSlots { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual ParkingBuilding Building { get; set; } = null!;
        public virtual ICollection<ParkingSlot> Slots { get; set; } = new List<ParkingSlot>();
    }
}
