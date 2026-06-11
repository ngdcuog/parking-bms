using System;
using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Slots
{
    public class CreateSlotRequest
    {
        public string SlotCode { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
    }

    public class EditSlotRequest
    {
        public string SlotCode { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
    }

    public class BulkCreateSlotRequest
    {
        public string Prefix { get; set; } = null!;
        public int StartNumber { get; set; }
        public int EndNumber { get; set; }
        public VehicleType VehicleType { get; set; }
    }

    public class UpdateSlotStatusRequest
    {
        public SlotStatus Status { get; set; }
    }

    public class SlotDTO
    {
        public int SlotId { get; set; }
        public int FloorId { get; set; }
        public string SlotCode { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public SlotStatus Status { get; set; }
        public bool IsActive { get; set; }
    }

    public class SlotGridDTO
    {
        public int SlotId { get; set; }
        public string SlotCode { get; set; } = null!;
        public SlotStatus Status { get; set; }
    }

    public class FloorSlotGridDTO
    {
        public int FloorId { get; set; }
        public string FloorName { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public int TotalSlots { get; set; }
        public int FreeCount { get; set; }
        public int OccupiedCount { get; set; }
        public int ReservedCount { get; set; }
        public List<SlotGridDTO> Slots { get; set; } = new List<SlotGridDTO>();
    }

    public class SlotDetailDTO : SlotDTO
    {
        public ActiveSessionSummaryDTO? ActiveSession { get; set; }
    }

    public class ActiveSessionSummaryDTO
    {
        public Guid SessionId { get; set; }
        public string LicensePlate { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public string SlotCode { get; set; } = null!;
        public string FloorName { get; set; } = null!;
        public string? BuildingName { get; set; }
        public DateTime CheckInTime { get; set; }
        public int DurationMinutes { get; set; }
        public decimal EstimatedFee { get; set; }
    }
}
