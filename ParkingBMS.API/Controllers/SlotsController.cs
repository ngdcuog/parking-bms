using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class SlotsController : BaseApiController
    {
        private readonly ISlotService _slotService;

        public SlotsController(ISlotService slotService)
        {
            _slotService = slotService;
        }

        [HttpGet("/api/v1/floors/{floorId}/slots")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<PagedResult<SlotDTO>>>> GetSlotsByFloorId(
            int floorId, 
            [FromQuery] SlotStatus? status, 
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20)
        {
            var result = await _slotService.GetSlotsByFloorIdAsync(floorId, status, page, pageSize);
            return Ok(ApiResponse<PagedResult<SlotDTO>>.SuccessResponse(result));
        }

        [HttpGet("/api/v1/floors/{floorId}/slots/grid")]
        [Authorize(Roles = "Admin,Manager,Staff,ParkingUser")]
        public async Task<ActionResult<ApiResponse<FloorSlotGridDTO>>> GetFloorSlotGrid(int floorId)
        {
            var result = await _slotService.GetFloorSlotGridAsync(floorId);
            return Ok(ApiResponse<FloorSlotGridDTO>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<SlotDetailDTO>>> GetSlotById(int id)
        {
            var result = await _slotService.GetSlotByIdAsync(id);
            return Ok(ApiResponse<SlotDetailDTO>.SuccessResponse(result));
        }

        [HttpPost("/api/v1/floors/{floorId}/slots")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<SlotDTO>>> CreateSlot(int floorId, [FromBody] CreateSlotRequest request)
        {
            var result = await _slotService.CreateSlotAsync(floorId, request);
            return Ok(ApiResponse<SlotDTO>.SuccessResponse(result, "Tạo slot đỗ xe thành công."));
        }

        [HttpPost("/api/v1/floors/{floorId}/slots/bulk")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<object>>> BulkCreateSlots(int floorId, [FromBody] BulkCreateSlotRequest request)
        {
            var count = await _slotService.BulkCreateSlotsAsync(floorId, request);
            return Ok(ApiResponse<object>.SuccessResponse(new { CreatedCount = count }, $"Tạo thành công {count} slot đỗ xe."));
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<SlotDTO>>> UpdateSlotStatus(int id, [FromBody] UpdateSlotStatusRequest request)
        {
            var result = await _slotService.UpdateSlotStatusAsync(id, request.Status, CurrentUserId);
            return Ok(ApiResponse<SlotDTO>.SuccessResponse(result, "Cập nhật trạng thái slot thành công."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<SlotDTO>>> UpdateSlot(int id, [FromBody] EditSlotRequest request)
        {
            var result = await _slotService.UpdateSlotAsync(id, request);
            return Ok(ApiResponse<SlotDTO>.SuccessResponse(result, "Cập nhật thông tin slot thành công."));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteSlot(int id)
        {
            await _slotService.DeleteSlotAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa slot thành công (soft delete)."));
        }

        [HttpDelete("/api/v1/floors/{floorId}/slots")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteAllSlots(int floorId)
        {
            await _slotService.DeleteAllSlotsByFloorIdAsync(floorId);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa toàn bộ ô đỗ xe của tầng thành công."));
        }
    }
}
