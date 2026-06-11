using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Reports;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface IReportService
    {
        Task<DashboardSummaryDTO> GetDashboardSummaryAsync();
        Task<IEnumerable<RevenueReportDTO>> GetRevenueReportAsync(DateTime dateFrom, DateTime dateTo, string groupBy, VehicleType? vehicleType);
        Task<IEnumerable<HourlyTrafficDTO>> GetHourlyTrafficReportAsync(DateTime dateFrom, DateTime dateTo, VehicleType? vehicleType);
        Task<IEnumerable<SlotUtilizationDTO>> GetSlotUtilizationReportAsync(DateTime dateFrom, DateTime dateTo, int? floorId);
        Task<ExceptionsSummaryDTO> GetExceptionsSummaryAsync(DateTime dateFrom, DateTime dateTo);
    }
}
