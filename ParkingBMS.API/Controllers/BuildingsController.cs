using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Buildings;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class BuildingsController : BaseApiController
    {
        private readonly IBuildingService _buildingService;

        public BuildingsController(IBuildingService buildingService)
        {
            _buildingService = buildingService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<IEnumerable<BuildingDTO>>>> GetBuildings()
        {
            var result = await _buildingService.GetBuildingsAsync();
            return Ok(ApiResponse<IEnumerable<BuildingDTO>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<BuildingDetailDTO>>> GetBuildingById(int id)
        {
            var result = await _buildingService.GetBuildingByIdAsync(id);
            return Ok(ApiResponse<BuildingDetailDTO>.SuccessResponse(result));
        }

        [HttpGet("public-info")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<IEnumerable<BuildingPublicInfoDTO>>>> GetBuildingsPublicInfo()
        {
            var result = await _buildingService.GetBuildingsPublicInfoAsync();
            return Ok(ApiResponse<IEnumerable<BuildingPublicInfoDTO>>.SuccessResponse(result));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<BuildingDTO>>> CreateBuilding([FromBody] CreateBuildingRequest request)
        {
            var result = await _buildingService.CreateBuildingAsync(request);
            return Ok(ApiResponse<BuildingDTO>.SuccessResponse(result, "Tạo tòa nhà thành công."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<BuildingDTO>>> UpdateBuilding(int id, [FromBody] UpdateBuildingRequest request)
        {
            var result = await _buildingService.UpdateBuildingAsync(id, request);
            return Ok(ApiResponse<BuildingDTO>.SuccessResponse(result, "Cập nhật thông tin tòa nhà thành công."));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteBuilding(int id)
        {
            await _buildingService.DeleteBuildingAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa tòa nhà thành công."));
        }
    }
}
