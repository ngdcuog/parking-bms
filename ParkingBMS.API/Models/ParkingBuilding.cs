using System;
using System.Collections.Generic;

namespace ParkingBMS.API.Models
{
    public class ParkingBuilding
    {
        public int BuildingId { get; set; }
        public string BuildingName { get; set; } = null!;
        public string? Address { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }
        public string? ContactPhone { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation properties
        public virtual ICollection<ParkingFloor> Floors { get; set; } = new List<ParkingFloor>();
    }
}
