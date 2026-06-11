using System;
using System.Collections.Generic;

namespace ParkingBMS.API.DTOs.Buildings
{
    public class CreateBuildingRequest
    {
        public string BuildingName { get; set; } = null!;
        public string? Address { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }
        public string? ContactPhone { get; set; }
    }

    public class UpdateBuildingRequest
    {
        public string BuildingName { get; set; } = null!;
        public string? Address { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }
        public string? ContactPhone { get; set; }
        public bool IsActive { get; set; }
    }

    public class BuildingDTO
    {
        public int BuildingId { get; set; }
        public string BuildingName { get; set; } = null!;
        public string? Address { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }
        public string? ContactPhone { get; set; }
        public bool IsActive { get; set; }
    }

    public class BuildingDetailDTO : BuildingDTO
    {
        public List<FloorSummaryDTO> Floors { get; set; } = new List<FloorSummaryDTO>();
    }

    public class FloorSummaryDTO
    {
        public int FloorId { get; set; }
        public string FloorName { get; set; } = null!;
        public short FloorNumber { get; set; }
        public byte VehicleType { get; set; }
        public short TotalSlots { get; set; }
    }

    public class BuildingPublicInfoDTO
    {
        public int BuildingId { get; set; }
        public string BuildingName { get; set; } = null!;
        public string? Address { get; set; }
        public TimeSpan OpenTime { get; set; }
        public TimeSpan CloseTime { get; set; }
        public string? ContactPhone { get; set; }
        public FreeSlotsCount FreeSlots { get; set; } = new FreeSlotsCount();
    }

    public class FreeSlotsCount
    {
        public int Motorbike { get; set; }
        public int Car { get; set; }
        public int Truck { get; set; }
    }
}
