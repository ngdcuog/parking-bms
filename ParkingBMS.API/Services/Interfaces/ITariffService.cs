using System.Collections.Generic;
using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Tariffs;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface ITariffService
    {
        Task<IEnumerable<TariffDTO>> GetTariffsAsync(VehicleType? vehicleType, bool? isActive);
        Task<IEnumerable<TariffDTO>> GetActiveTariffsAsync();
        Task<TariffDTO> GetTariffByIdAsync(int id);
        Task<TariffDTO> CreateTariffAsync(CreateTariffRequest request);
        Task<TariffDTO> UpdateTariffStatusAsync(int id, bool isActive);
    }
}
