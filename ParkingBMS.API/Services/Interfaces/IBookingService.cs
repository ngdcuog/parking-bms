using System;
using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Bookings;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface IBookingService
    {
        Task<BookingDTO> CreateBookingAsync(int userId, CreateBookingRequest request);
        Task<PagedResult<BookingDTO>> GetMyBookingsAsync(int userId, BookingStatus? status, int page, int pageSize);
        Task<BookingDTO> GetBookingByIdAsync(int id, int userId, UserRole role);
        Task CancelBookingAsync(int id, int userId);
        Task<PagedResult<BookingDTO>> GetBookingsAsync(BookingStatus? status, int? userId, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize);
    }
}
