using System.Threading.Tasks;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Models;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface ISlotAllocationService
    {
        Task<(ParkingSlot slot, string scoreNote)> AllocateSlotAsync(VehicleType vehicleType, int? buildingId = null);
    }
}
