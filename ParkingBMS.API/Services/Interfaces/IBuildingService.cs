using System.Collections.Generic;
using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Buildings;
using ParkingBMS.API.DTOs.Floors;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface IBuildingService
    {
        Task<IEnumerable<BuildingDTO>> GetBuildingsAsync();
        Task<BuildingDetailDTO> GetBuildingByIdAsync(int id);
        Task<IEnumerable<BuildingPublicInfoDTO>> GetBuildingsPublicInfoAsync();
        Task<BuildingDTO> CreateBuildingAsync(CreateBuildingRequest request);
        Task<BuildingDTO> UpdateBuildingAsync(int id, UpdateBuildingRequest request);

        Task<IEnumerable<FloorDTO>> GetFloorsByBuildingIdAsync(int buildingId);
        Task<FloorDTO> GetFloorByIdAsync(int floorId);
        Task<FloorDTO> CreateFloorAsync(int buildingId, CreateFloorRequest request);
        Task<FloorDTO> UpdateFloorAsync(int floorId, UpdateFloorRequest request);
        Task DeleteFloorAsync(int floorId);
        Task DeleteBuildingAsync(int buildingId);
    }
}
