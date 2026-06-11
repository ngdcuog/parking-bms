using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Bookings;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class BookingsController : BaseApiController
    {
        private readonly IBookingService _bookingService;

        public BookingsController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        [HttpPost]
        [Authorize(Roles = "ParkingUser")]
        public async Task<ActionResult<ApiResponse<BookingDTO>>> CreateBooking([FromBody] CreateBookingRequest request)
        {
            var result = await _bookingService.CreateBookingAsync(CurrentUserId, request);
            return Ok(ApiResponse<BookingDTO>.SuccessResponse(result, "Đặt chỗ thành công."));
        }

        [HttpGet("my")]
        [Authorize(Roles = "ParkingUser")]
        public async Task<ActionResult<ApiResponse<PagedResult<BookingDTO>>>> GetMyBookings(
            [FromQuery] BookingStatus? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _bookingService.GetMyBookingsAsync(CurrentUserId, status, page, pageSize);
            return Ok(ApiResponse<PagedResult<BookingDTO>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<BookingDTO>>> GetBookingById(int id)
        {
            var result = await _bookingService.GetBookingByIdAsync(id, CurrentUserId, CurrentUserRole);
            return Ok(ApiResponse<BookingDTO>.SuccessResponse(result));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "ParkingUser")]
        public async Task<ActionResult<ApiResponse<object>>> CancelBooking(int id)
        {
            await _bookingService.CancelBookingAsync(id, CurrentUserId);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Hủy đặt chỗ thành công."));
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<PagedResult<BookingDTO>>>> GetBookings(
            [FromQuery] BookingStatus? status,
            [FromQuery] int? userId,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _bookingService.GetBookingsAsync(status, userId, dateFrom, dateTo, page, pageSize);
            return Ok(ApiResponse<PagedResult<BookingDTO>>.SuccessResponse(result));
        }
    }
}
