using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface ISlotService
    {
        Task<PagedResult<SlotDTO>> GetSlotsByFloorIdAsync(int floorId, SlotStatus? status, int page, int pageSize);
        Task<FloorSlotGridDTO> GetFloorSlotGridAsync(int floorId);
        Task<SlotDetailDTO> GetSlotByIdAsync(int slotId);
        Task<SlotDTO> CreateSlotAsync(int floorId, CreateSlotRequest request);
        Task<int> BulkCreateSlotsAsync(int floorId, BulkCreateSlotRequest request);
        Task<SlotDTO> UpdateSlotStatusAsync(int slotId, SlotStatus status, int? userId = null);
        Task<SlotDTO> UpdateSlotAsync(int slotId, EditSlotRequest request);
        Task DeleteSlotAsync(int slotId);
        Task DeleteAllSlotsByFloorIdAsync(int floorId);
    }
}
