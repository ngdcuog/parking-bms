using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Tariffs;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class TariffsController : BaseApiController
    {
        private readonly ITariffService _tariffService;

        public TariffsController(ITariffService tariffService)
        {
            _tariffService = tariffService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<IEnumerable<TariffDTO>>>> GetTariffs(
            [FromQuery] VehicleType? vehicleType,
            [FromQuery] bool? isActive)
        {
            var result = await _tariffService.GetTariffsAsync(vehicleType, isActive);
            return Ok(ApiResponse<IEnumerable<TariffDTO>>.SuccessResponse(result));
        }

        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<IEnumerable<TariffDTO>>>> GetActiveTariffs()
        {
            var result = await _tariffService.GetActiveTariffsAsync();
            return Ok(ApiResponse<IEnumerable<TariffDTO>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<TariffDTO>>> GetTariffById(int id)
        {
            var result = await _tariffService.GetTariffByIdAsync(id);
            return Ok(ApiResponse<TariffDTO>.SuccessResponse(result));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<TariffDTO>>> CreateTariff([FromBody] CreateTariffRequest request)
        {
            var result = await _tariffService.CreateTariffAsync(request);
            return Ok(ApiResponse<TariffDTO>.SuccessResponse(result, "Tạo bảng giá mới thành công."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<TariffDTO>>> UpdateTariffStatus(int id, [FromBody] UpdateTariffRequest request)
        {
            var result = await _tariffService.UpdateTariffStatusAsync(id, request.IsActive);
            return Ok(ApiResponse<TariffDTO>.SuccessResponse(result, "Cập nhật trạng thái bảng giá thành công."));
        }
    }
}
