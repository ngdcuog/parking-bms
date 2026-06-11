using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Floors
{
    public class CreateFloorRequest
    {
        public string FloorName { get; set; } = null!;
        public short FloorNumber { get; set; }
        public VehicleType VehicleType { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateFloorRequest
    {
        public string FloorName { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }

    public class FloorDTO
    {
        public int FloorId { get; set; }
        public int BuildingId { get; set; }
        public string FloorName { get; set; } = null!;
        public short FloorNumber { get; set; }
        public VehicleType VehicleType { get; set; }
        public short TotalSlots { get; set; }
        public bool IsActive { get; set; }

        public int FreeSlots { get; set; }
        public int OccupiedSlots { get; set; }
        public int ReservedSlots { get; set; }
        public int MaintenanceSlots { get; set; }
        public int LockedSlots { get; set; }
    }

    public class FloorDetailDTO : FloorDTO
    {
        // inherits everything, can be extended if needed
    }
}
