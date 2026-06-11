using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Data;
using ParkingBMS.API.DTOs.Bookings;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class BookingService : IBookingService
    {
        private readonly IRepository<Booking> _bookingRepository;
        private readonly IRepository<ParkingSlot> _slotRepository;
        private readonly IRepository<AppUser> _userRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public BookingService(
            IRepository<Booking> bookingRepository,
            IRepository<ParkingSlot> slotRepository,
            IRepository<AppUser> userRepository,
            AppDbContext context,
            IMapper mapper)
        {
            _bookingRepository = bookingRepository;
            _slotRepository = slotRepository;
            _userRepository = userRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<BookingDTO> CreateBookingAsync(int userId, CreateBookingRequest request)
        {
            // Validate Planned Times (BR-06.3, BR-06.4, BR-06.5)
            var now = DateTime.UtcNow;
            if (request.PlannedCheckIn < now.AddMinutes(30))
            {
                throw new ParkingException("BOOKING_TOO_EARLY", "Thời gian vào dự kiến phải sau thời điểm hiện tại ít nhất 30 phút.", 400);
            }

            if (request.PlannedCheckOut <= request.PlannedCheckIn)
            {
                throw new ParkingException("VALIDATION_ERROR", "Thời gian ra phải sau thời gian vào.", 400);
            }

            if ((request.PlannedCheckOut - request.PlannedCheckIn).TotalDays > 7)
            {
                throw new ParkingException("BOOKING_TOO_LONG", "Thời hạn đặt chỗ tối đa là 7 ngày.", 400);
            }

            // Verify User exists and Role is ParkingUser
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.Role != UserRole.ParkingUser)
            {
                throw new ParkingException("FORBIDDEN", "Chỉ khách gửi xe mới có quyền đặt chỗ trước.", 403);
            }

            // Verify limit of maximum 3 pending bookings (BR-06.11)
            var pendingCount = await _bookingRepository.GetQueryable()
                .CountAsync(b => b.UserId == userId && b.Status == BookingStatus.Pending);

            if (pendingCount >= 3)
            {
                throw new ParkingException("MAX_PENDING_EXCEEDED", "Bạn đã đạt giới hạn tối đa 3 booking ở trạng thái chờ.", 429);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int targetBuildingId = request.BuildingId ?? 0;
                if (targetBuildingId == 0)
                {
                    var firstBuilding = await _context.ParkingBuildings.FirstOrDefaultAsync(b => b.IsActive);
                    if (firstBuilding == null)
                    {
                        throw new ParkingException("NO_BUILDING_AVAILABLE", "Hệ thống chưa cấu hình tòa nhà hoạt động nào.", 404);
                    }
                    targetBuildingId = firstBuilding.BuildingId;
                }

                // Fetch all active slots that match the vehicle type in the target building
                var availableSlots = await _slotRepository.GetQueryable()
                    .Include(s => s.Floor)
                    .ThenInclude(f => f.Building)
                    .Where(s => s.IsActive && s.Floor.IsActive && s.VehicleType == request.VehicleType && s.Floor.BuildingId == targetBuildingId
                                && s.Status != SlotStatus.Maintenance && s.Status != SlotStatus.Locked)
                    .ToListAsync();

                if (!availableSlots.Any())
                {
                    throw new ParkingException("NO_SLOT_AVAILABLE", "Bãi xe không có slot trống phù hợp cho loại xe này.", 404);
                }

                // Check conflict with other bookings (BR-06.6)
                // Overlap condition: booking.PlannedCheckIn < request.PlannedCheckOut && booking.PlannedCheckOut > request.PlannedCheckIn
                // and Status is Pending or Active
                var conflictingBookings = await _bookingRepository.GetQueryable()
                    .Where(b => (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Active) &&
                                b.PlannedCheckIn < request.PlannedCheckOut && 
                                b.PlannedCheckOut > request.PlannedCheckIn)
                    .Select(b => b.SlotId)
                    .ToListAsync();

                // Select the first slot that has no conflicting bookings
                var targetSlot = availableSlots.FirstOrDefault(s => !conflictingBookings.Contains(s.SlotId));

                if (targetSlot == null)
                {
                    throw new ParkingException("NO_SLOT_AVAILABLE", "Không tìm thấy slot trống nào không bị trùng lịch đặt trong khung giờ này.", 404);
                }

                // Create booking entity
                var newBooking = new Booking
                {
                    UserId = userId,
                    SlotId = targetSlot.SlotId,
                    VehicleType = request.VehicleType,
                    LicensePlate = request.LicensePlate?.Trim().ToUpper(),
                    PlannedCheckIn = request.PlannedCheckIn,
                    PlannedCheckOut = request.PlannedCheckOut,
                    QRCode = "TEMP_QR", // Will be updated below with BookingId
                    Status = BookingStatus.Pending,
                    CreatedAt = now,
                    ExpiredAt = request.PlannedCheckIn.AddMinutes(15) // Grace period (BR-06.7)
                };

                await _bookingRepository.AddAsync(newBooking);
                await _bookingRepository.SaveChangesAsync();

                // Generate booking QR code format: BOOKING:BookingId (BR-06.8)
                newBooking.QRCode = $"BOOKING:{newBooking.BookingId}";
                _bookingRepository.Update(newBooking);

                // Reserve the slot in DB (BR-06.7)
                targetSlot.Status = SlotStatus.Reserved;
                _slotRepository.Update(targetSlot);

                await _bookingRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                // Load navigation properties for mapping
                newBooking.User = user;
                newBooking.Slot = targetSlot;

                return _mapper.Map<BookingDTO>(newBooking);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResult<BookingDTO>> GetMyBookingsAsync(int userId, BookingStatus? status, int page, int pageSize)
        {
            var query = _bookingRepository.GetQueryable()
                .Include(b => b.User)
                .Include(b => b.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .Where(b => b.UserId == userId);

            if (status.HasValue)
            {
                query = query.Where(b => b.Status == status.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<BookingDTO>>(items);
            return new PagedResult<BookingDTO>(dtos, totalCount, page, pageSize);
        }

        public async Task<BookingDTO> GetBookingByIdAsync(int id, int userId, UserRole role)
        {
            var booking = await _bookingRepository.GetQueryable()
                .Include(b => b.User)
                .Include(b => b.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
            {
                throw new ParkingException("BOOKING_NOT_FOUND", "Đặt chỗ không tồn tại.", 404);
            }

            // Owner only restriction (unless Admin/Manager)
            if (role == UserRole.ParkingUser && booking.UserId != userId)
            {
                throw new ParkingException("FORBIDDEN", "Bạn không có quyền xem thông tin đặt chỗ này.", 403);
            }

            return _mapper.Map<BookingDTO>(booking);
        }

        public async Task CancelBookingAsync(int id, int userId)
        {
            var booking = await _bookingRepository.GetQueryable()
                .Include(b => b.Slot)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null)
            {
                throw new ParkingException("BOOKING_NOT_FOUND", "Đặt chỗ không tồn tại.", 404);
            }

            // Owner restriction
            if (booking.UserId != userId)
            {
                throw new ParkingException("FORBIDDEN", "Bạn không có quyền hủy đặt chỗ này.", 403);
            }

            // Can only cancel status Pending (0) (BR-06.9)
            if (booking.Status != BookingStatus.Pending)
            {
                throw new ParkingException("BOOKING_CANNOT_CANCEL", "Không thể hủy lịch đặt chỗ đã kích hoạt hoặc hết hạn.", 409);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                booking.Status = BookingStatus.Cancelled;
                _bookingRepository.Update(booking);

                // Free up the slot
                if (booking.Slot.Status == SlotStatus.Reserved)
                {
                    booking.Slot.Status = SlotStatus.Free;
                    _slotRepository.Update(booking.Slot);
                }

                await _bookingRepository.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResult<BookingDTO>> GetBookingsAsync(BookingStatus? status, int? userId, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize)
        {
            var query = _bookingRepository.GetQueryable()
                .Include(b => b.User)
                .Include(b => b.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(b => b.Status == status.Value);
            }

            if (userId.HasValue)
            {
                query = query.Where(b => b.UserId == userId.Value);
            }

            if (dateFrom.HasValue)
            {
                query = query.Where(b => b.PlannedCheckIn >= dateFrom.Value);
            }

            if (dateTo.HasValue)
            {
                query = query.Where(b => b.PlannedCheckIn <= dateTo.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<BookingDTO>>(items);
            return new PagedResult<BookingDTO>(dtos, totalCount, page, pageSize);
        }
    }
}
