using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Floors;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class FloorsController : BaseApiController
    {
        private readonly IBuildingService _buildingService;

        public FloorsController(IBuildingService buildingService)
        {
            _buildingService = buildingService;
        }

        [HttpGet("/api/v1/buildings/{buildingId}/floors")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<IEnumerable<FloorDTO>>>> GetFloorsByBuildingId(int buildingId)
        {
            var result = await _buildingService.GetFloorsByBuildingIdAsync(buildingId);
            return Ok(ApiResponse<IEnumerable<FloorDTO>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<FloorDTO>>> GetFloorById(int id)
        {
            var result = await _buildingService.GetFloorByIdAsync(id);
            return Ok(ApiResponse<FloorDTO>.SuccessResponse(result));
        }

        [HttpPost("/api/v1/buildings/{buildingId}/floors")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<FloorDTO>>> CreateFloor(int buildingId, [FromBody] CreateFloorRequest request)
        {
            var result = await _buildingService.CreateFloorAsync(buildingId, request);
            return Ok(ApiResponse<FloorDTO>.SuccessResponse(result, "Tạo tầng thành công."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<FloorDTO>>> UpdateFloor(int id, [FromBody] UpdateFloorRequest request)
        {
            var result = await _buildingService.UpdateFloorAsync(id, request);
            return Ok(ApiResponse<FloorDTO>.SuccessResponse(result, "Cập nhật tầng thành công."));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteFloor(int id)
        {
            await _buildingService.DeleteFloorAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa tầng đỗ xe thành công."));
        }
    }
}
