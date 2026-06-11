using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Reports;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize(Roles = "Admin,Manager")]
    public class ReportsController : BaseApiController
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("dashboard-summary")]
        public async Task<ActionResult<ApiResponse<DashboardSummaryDTO>>> GetDashboardSummary()
        {
            var result = await _reportService.GetDashboardSummaryAsync();
            return Ok(ApiResponse<DashboardSummaryDTO>.SuccessResponse(result));
        }

        [HttpGet("revenue")]
        public async Task<ActionResult<ApiResponse<IEnumerable<RevenueReportDTO>>>> GetRevenue(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] string groupBy = "day",
            [FromQuery] VehicleType? vehicleType = null)
        {
            var from = dateFrom ?? DateTime.UtcNow.AddDays(-30);
            var to = dateTo ?? DateTime.UtcNow;

            var result = await _reportService.GetRevenueReportAsync(from, to, groupBy, vehicleType);
            return Ok(ApiResponse<IEnumerable<RevenueReportDTO>>.SuccessResponse(result));
        }

        [HttpGet("hourly-traffic")]
        public async Task<ActionResult<ApiResponse<IEnumerable<HourlyTrafficDTO>>>> GetHourlyTraffic(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] VehicleType? vehicleType = null)
        {
            var from = dateFrom ?? DateTime.UtcNow.Date;
            var to = dateTo ?? DateTime.UtcNow;

            var result = await _reportService.GetHourlyTrafficReportAsync(from, to, vehicleType);
            return Ok(ApiResponse<IEnumerable<HourlyTrafficDTO>>.SuccessResponse(result));
        }

        [HttpGet("slot-utilization")]
        public async Task<ActionResult<ApiResponse<IEnumerable<SlotUtilizationDTO>>>> GetSlotUtilization(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int? floorId = null)
        {
            var from = dateFrom ?? DateTime.UtcNow.AddDays(-30);
            var to = dateTo ?? DateTime.UtcNow;

            var result = await _reportService.GetSlotUtilizationReportAsync(from, to, floorId);
            return Ok(ApiResponse<IEnumerable<SlotUtilizationDTO>>.SuccessResponse(result));
        }

        [HttpGet("exceptions-summary")]
        public async Task<ActionResult<ApiResponse<ExceptionsSummaryDTO>>> GetExceptionsSummary(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo)
        {
            var from = dateFrom ?? DateTime.UtcNow.AddDays(-30);
            var to = dateTo ?? DateTime.UtcNow;

            var result = await _reportService.GetExceptionsSummaryAsync(from, to);
            return Ok(ApiResponse<ExceptionsSummaryDTO>.SuccessResponse(result));
        }
    }
}
