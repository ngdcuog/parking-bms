using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.DTOs.Sessions;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class SessionsController : BaseApiController
    {
        private readonly ISessionService _sessionService;

        public SessionsController(ISessionService sessionService)
        {
            _sessionService = sessionService;
        }

        [HttpPost("checkin")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<CheckInResponseDTO>>> CheckInWalkIn([FromBody] CheckInRequest request)
        {
            var result = await _sessionService.CheckInWalkInAsync(request, CurrentUserId);
            return Ok(ApiResponse<CheckInResponseDTO>.SuccessResponse(result, "Cho xe vào bãi thành công."));
        }

        [HttpPost("checkin-booking")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<CheckInResponseDTO>>> CheckInBooking([FromBody] CheckInBookingRequest request)
        {
            var result = await _sessionService.CheckInBookingAsync(request.QrCode, CurrentUserId);
            return Ok(ApiResponse<CheckInResponseDTO>.SuccessResponse(result, "Check-in xe đặt chỗ thành công."));
        }

        [HttpPost("checkout")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<CheckOutResponseDTO>>> CheckOutNormal([FromBody] CheckOutRequest request)
        {
            var result = await _sessionService.CheckOutNormalAsync(request, CurrentUserId);
            return Ok(ApiResponse<CheckOutResponseDTO>.SuccessResponse(result, "Thanh toán và cho xe ra bãi thành công."));
        }

        [HttpPost("checkout-by-plate")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ActiveSessionSummaryDTO>>>> GetActiveSessionsByPlate([FromBody] CheckoutByPlateRequest request)
        {
            var result = await _sessionService.GetActiveSessionsByPlateAsync(request.LicensePlate, CurrentUserId);
            return Ok(ApiResponse<IEnumerable<ActiveSessionSummaryDTO>>.SuccessResponse(result));
        }

        [HttpPost("{id}/checkout-confirm")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<CheckOutResponseDTO>>> ConfirmCheckOut(Guid id, [FromBody] CheckoutConfirmRequest request)
        {
            var result = await _sessionService.ConfirmCheckOutAsync(id, request, CurrentUserId);
            return Ok(ApiResponse<CheckOutResponseDTO>.SuccessResponse(result, "Xác nhận thanh toán thành công."));
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<PagedResult<SessionSummaryDTO>>>> GetSessions(
            [FromQuery] SessionStatus? status,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] VehicleType? vehicleType,
            [FromQuery] int? floorId,
            [FromQuery] string? licensePlate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _sessionService.GetSessionsAsync(status, dateFrom, dateTo, vehicleType, floorId, licensePlate, page, pageSize);
            return Ok(ApiResponse<PagedResult<SessionSummaryDTO>>.SuccessResponse(result));
        }

        [HttpGet("active")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ActiveSessionSummaryDTO>>>> GetActiveSessions(
            [FromQuery] int? floorId,
            [FromQuery] VehicleType? vehicleType)
        {
            var result = await _sessionService.GetActiveSessionsAsync(floorId, vehicleType);
            return Ok(ApiResponse<IEnumerable<ActiveSessionSummaryDTO>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Staff")]
        public async Task<ActionResult<ApiResponse<SessionDetailDTO>>> GetSessionById(Guid id)
        {
            var result = await _sessionService.GetSessionByIdAsync(id);
            return Ok(ApiResponse<SessionDetailDTO>.SuccessResponse(result));
        }

        [HttpGet("{id}/current-fee")]
        [Authorize(Roles = "Admin,Manager,Staff,ParkingUser")]
        public async Task<ActionResult<ApiResponse<CurrentFeeResponseDTO>>> GetCurrentFee(Guid id)
        {
            var result = await _sessionService.GetCurrentFeeAsync(id);
            return Ok(ApiResponse<CurrentFeeResponseDTO>.SuccessResponse(result));
        }

        [HttpGet("my-history")]
        [Authorize(Roles = "ParkingUser")]
        public async Task<ActionResult<ApiResponse<PagedResult<SessionSummaryDTO>>>> GetMySessionHistory(
            [FromQuery] SessionStatus? status,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _sessionService.GetMySessionHistoryAsync(CurrentUserId, status, dateFrom, dateTo, page, pageSize);
            return Ok(ApiResponse<PagedResult<SessionSummaryDTO>>.SuccessResponse(result));
        }

        [HttpPut("{id}/license-plate")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<SessionDetailDTO>>> UpdateLicensePlate(Guid id, [FromBody] UpdateLicensePlateRequest request)
        {
            var result = await _sessionService.UpdateLicensePlateAsync(id, request, CurrentUserId);
            return Ok(ApiResponse<SessionDetailDTO>.SuccessResponse(result, "Cập nhật biển số xe và ghi nhận ExceptionLog thành công."));
        }

        [HttpPut("{id}/slot")]
        [Authorize(Roles = "Staff,Admin")]
        public async Task<ActionResult<ApiResponse<SessionDetailDTO>>> UpdateSlot(Guid id, [FromBody] UpdateSlotRequest request)
        {
            var result = await _sessionService.UpdateSlotAsync(id, request, CurrentUserId);
            return Ok(ApiResponse<SessionDetailDTO>.SuccessResponse(result, "Thay đổi slot đỗ và ghi nhận ExceptionLog thành công."));
        }
    }

    public class CheckInBookingRequest
    {
        public string QrCode { get; set; } = null!;
    }
}
