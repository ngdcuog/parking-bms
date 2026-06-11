using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.DTOs.Sessions;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface ISessionService
    {
        Task<CheckInResponseDTO> CheckInWalkInAsync(CheckInRequest request, int staffId);
        Task<CheckInResponseDTO> CheckInBookingAsync(string qrCode, int staffId);
        Task<CheckOutResponseDTO> CheckOutNormalAsync(CheckOutRequest request, int staffId);
        Task<IEnumerable<ActiveSessionSummaryDTO>> GetActiveSessionsByPlateAsync(string licensePlate, int? staffId = null);
        Task<CheckOutResponseDTO> ConfirmCheckOutAsync(Guid sessionId, CheckoutConfirmRequest request, int staffId);

        Task<PagedResult<SessionSummaryDTO>> GetSessionsAsync(SessionStatus? status, DateTime? dateFrom, DateTime? dateTo, VehicleType? vehicleType, int? floorId, string? licensePlate, int page, int pageSize);
        Task<IEnumerable<ActiveSessionSummaryDTO>> GetActiveSessionsAsync(int? floorId, VehicleType? vehicleType);
        Task<SessionDetailDTO> GetSessionByIdAsync(Guid sessionId);
        Task<CurrentFeeResponseDTO> GetCurrentFeeAsync(Guid sessionId);
        Task<PagedResult<SessionSummaryDTO>> GetMySessionHistoryAsync(int userId, SessionStatus? status, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize);

        Task<SessionDetailDTO> UpdateLicensePlateAsync(Guid sessionId, UpdateLicensePlateRequest request, int staffId);
        Task<SessionDetailDTO> UpdateSlotAsync(Guid sessionId, UpdateSlotRequest request, int staffId);
    }
}
