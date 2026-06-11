using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Data;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.DTOs.Sessions;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class SessionService : ISessionService
    {
        private readonly IRepository<ParkingSession> _sessionRepository;
        private readonly IRepository<ParkingSlot> _slotRepository;
        private readonly IRepository<ParkingBuilding> _buildingRepository;
        private readonly IRepository<Booking> _bookingRepository;
        private readonly IRepository<Payment> _paymentRepository;
        private readonly IRepository<ExceptionLog> _exceptionRepository;
        private readonly ISlotAllocationService _slotAllocation;
        private readonly IFeeCalculationService _feeCalculator;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public SessionService(
            IRepository<ParkingSession> sessionRepository,
            IRepository<ParkingSlot> slotRepository,
            IRepository<ParkingBuilding> buildingRepository,
            IRepository<Booking> bookingRepository,
            IRepository<Payment> paymentRepository,
            IRepository<ExceptionLog> exceptionRepository,
            ISlotAllocationService slotAllocation,
            IFeeCalculationService feeCalculator,
            AppDbContext context,
            IMapper mapper)
        {
            _sessionRepository = sessionRepository;
            _slotRepository = slotRepository;
            _buildingRepository = buildingRepository;
            _bookingRepository = bookingRepository;
            _paymentRepository = paymentRepository;
            _exceptionRepository = exceptionRepository;
            _slotAllocation = slotAllocation;
            _feeCalculator = feeCalculator;
            _context = context;
            _mapper = mapper;
        }

        public async Task<CheckInResponseDTO> CheckInWalkInAsync(CheckInRequest request, int staffId)
        {
            // Fetch staff details to get assigned building
            var staff = await _context.AppUsers.FindAsync(staffId);
            if (staff == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Không tìm thấy thông tin nhân viên.", 404);
            }
            if (!staff.BuildingId.HasValue)
            {
                throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc. Vui lòng liên hệ quản lý.", 400);
            }

            int staffBuildingId = staff.BuildingId.Value;

            // 1. Validate License Plate (V-01)
            if (!LicensePlateValidator.IsValid(request.LicensePlate, request.VehicleType))
            {
                throw new ParkingException("VALIDATION_ERROR", "Biển số xe không đúng định dạng quy định.", 400);
            }

            // 2. Check if building is in open hours (BR-03.3)
            var building = await _buildingRepository.GetByIdAsync(staffBuildingId);

            if (building != null)
            {
                // Local timezone of Vietnam is UTC+7
                var localTime = DateTime.UtcNow.AddHours(7);
                var timeOfDay = localTime.TimeOfDay;

                if (timeOfDay < building.OpenTime || timeOfDay > building.CloseTime)
                {
                    throw new ParkingException("BUILDING_CLOSED", $"Bãi xe đã đóng cửa. Giờ hoạt động: {building.OpenTime:hh\\:mm} - {building.CloseTime:hh\\:mm}.", 400);
                }
            }

            // 3. Allocate slot using AI algorithm (BR-08)
            var (allocatedSlot, scoreNote) = await _slotAllocation.AllocateSlotAsync(request.VehicleType, building?.BuildingId);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Concurrency double check
                var slot = await _slotRepository.GetByIdAsync(allocatedSlot.SlotId);
                if (slot == null || slot.Status != SlotStatus.Free || !slot.IsActive)
                {
                    throw new DbUpdateConcurrencyException(); // Will trigger retry in controller if desired, or handle immediately
                }

                // Create session
                var sessionId = Guid.NewGuid();
                var newSession = new ParkingSession
                {
                    SessionId = sessionId,
                    SlotId = slot.SlotId,
                    LicensePlate = request.LicensePlate.Trim().ToUpper(),
                    VehicleType = request.VehicleType,
                    CheckInTime = DateTime.UtcNow,
                    QRCode = sessionId.ToString().ToLower(),
                    SessionType = SessionType.WalkIn,
                    Status = SessionStatus.Active,
                    CheckInByStaffId = staffId,
                    Note = scoreNote
                };

                // Change slot status
                slot.Status = SlotStatus.Occupied;
                _slotRepository.Update(slot);

                await _sessionRepository.AddAsync(newSession);
                await _sessionRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                // Load navigation properties for DTO response mapping
                newSession.Slot = await _slotRepository.GetQueryable()
                    .Include(s => s.Floor)
                    .ThenInclude(f => f.Building)
                    .FirstOrDefaultAsync(s => s.SlotId == slot.SlotId);
                
                var response = _mapper.Map<CheckInResponseDTO>(newSession);
                response.AllocatedByAI = true;
                return response;
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                throw new ParkingException("CONCURRENCY_ERROR", "Slot vừa bị chiếm đoạt bởi luồng khác. Vui lòng thử lại.", 409);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<CheckInResponseDTO> CheckInBookingAsync(string qrCode, int staffId)
        {
            // Fetch staff details to get assigned building
            var staff = await _context.AppUsers
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.UserId == staffId);
            if (staff == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Không tìm thấy thông tin nhân viên.", 404);
            }
            if (!staff.BuildingId.HasValue)
            {
                throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc.", 400);
            }

            // Validate Booking QR code format: BOOKING:BookingId (BR-11.2)
            if (string.IsNullOrEmpty(qrCode) || !qrCode.StartsWith("BOOKING:"))
            {
                throw new ParkingException("BOOKING_NOT_FOUND", "Mã QR đặt chỗ không hợp lệ.", 400);
            }

            var parts = qrCode.Split(':');
            if (parts.Length < 2 || !int.TryParse(parts[1], out int bookingId))
            {
                throw new ParkingException("BOOKING_NOT_FOUND", "Mã QR đặt chỗ không đúng định dạng.", 400);
            }

            var booking = await _bookingRepository.GetQueryable()
                .Include(b => b.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .Include(b => b.User)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);

            if (booking == null)
            {
                throw new ParkingException("BOOKING_NOT_FOUND", "Thông tin đặt chỗ không tồn tại.", 404);
            }

            // Validate that the staff's building matches the booking's building
            if (booking.Slot.Floor.BuildingId != staff.BuildingId.Value)
            {
                throw new ParkingException("WRONG_BUILDING", $"Lịch đặt chỗ này là ở tòa nhà '{booking.Slot.Floor.Building.BuildingName}'. Bạn đang trực tại '{staff.Building?.BuildingName ?? "Tòa nhà khác"}'.", 400);
            }

            // Validate status (BR-06.10)
            if (booking.Status == BookingStatus.Expired)
            {
                throw new ParkingException("BOOKING_EXPIRED", "Lịch đặt chỗ này đã hết hạn (quá 15 phút grace period).", 410);
            }
            if (booking.Status != BookingStatus.Pending)
            {
                throw new ParkingException("BOOKING_ALREADY_USED", "Lịch đặt chỗ đã được sử dụng hoặc bị hủy.", 409);
            }

            // Validate expiration time
            if (booking.ExpiredAt < DateTime.UtcNow)
            {
                using var cancelTx = await _context.Database.BeginTransactionAsync();
                booking.Status = BookingStatus.Expired;
                booking.Slot.Status = SlotStatus.Free;
                _bookingRepository.Update(booking);
                _slotRepository.Update(booking.Slot);
                await _bookingRepository.SaveChangesAsync();
                await cancelTx.CommitAsync();

                throw new ParkingException("BOOKING_EXPIRED", "Lịch đặt chỗ này đã hết hạn.", 410);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Modify booking status
                booking.Status = BookingStatus.Active;
                _bookingRepository.Update(booking);

                // Modify slot status
                var slot = booking.Slot;
                slot.Status = SlotStatus.Occupied;
                _slotRepository.Update(slot);

                // Create session
                var sessionId = Guid.NewGuid();
                var newSession = new ParkingSession
                {
                    SessionId = sessionId,
                    SlotId = slot.SlotId,
                    UserId = booking.UserId,
                    BookingId = booking.BookingId,
                    LicensePlate = (booking.LicensePlate ?? "CHUA_DANG_KY").Trim().ToUpper(),
                    VehicleType = booking.VehicleType,
                    CheckInTime = DateTime.UtcNow,
                    QRCode = sessionId.ToString().ToLower(),
                    SessionType = SessionType.Booking,
                    Status = SessionStatus.Active,
                    CheckInByStaffId = staffId,
                    Note = "{\"allocatedByAI\":false,\"allocatedByBooking\":true}"
                };

                await _sessionRepository.AddAsync(newSession);
                await _sessionRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                newSession.Slot = await _slotRepository.GetQueryable()
                    .Include(s => s.Floor)
                    .ThenInclude(f => f.Building)
                    .FirstOrDefaultAsync(s => s.SlotId == slot.SlotId);

                var response = _mapper.Map<CheckInResponseDTO>(newSession);
                response.AllocatedByAI = false;
                return response;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<CheckOutResponseDTO> CheckOutNormalAsync(CheckOutRequest request, int staffId)
        {
            var staff = await _context.AppUsers.FindAsync(staffId);
            if (staff == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Không tìm thấy thông tin nhân viên.", 404);
            }
            if (!staff.BuildingId.HasValue && staff.Role == UserRole.Staff)
            {
                throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc.", 400);
            }

            var session = await _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .FirstOrDefaultAsync(s => s.QRCode == request.QRCode.ToLower() && s.Status == SessionStatus.Active);

            if (session == null)
            {
                throw new ParkingException("SESSION_NOT_FOUND", "Không tìm thấy lượt gửi xe đang hoạt động khớp với mã QR.", 404);
            }

            if (staff.Role == UserRole.Staff && session.Slot.Floor.BuildingId != staff.BuildingId.Value)
            {
                throw new ParkingException("WRONG_BUILDING", "Lượt gửi xe này thuộc tòa nhà khác.", 400);
            }

            // Calculate fees (BR-05)
            var feeResult = await _feeCalculator.CalculateFeeAsync(session.CheckInTime, DateTime.UtcNow, session.VehicleType, isLostTicket: false);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Create payment
                var payment = new Payment
                {
                    SessionId = session.SessionId,
                    Amount = feeResult.TotalFee,
                    BaseFee = feeResult.BaseFee,
                    PenaltyFee = feeResult.PenaltyFee,
                    PaymentMethod = request.PaymentMethod,
                    PaidAt = DateTime.UtcNow,
                    ReceivedByStaffId = staffId
                };

                await _paymentRepository.AddAsync(payment);

                // Update session
                session.CheckOutTime = DateTime.UtcNow;
                session.Fee = feeResult.TotalFee;
                session.Status = SessionStatus.Closed;
                session.CheckOutByStaffId = staffId;
                _sessionRepository.Update(session);

                // Free up slot
                var slot = session.Slot;
                slot.Status = SlotStatus.Free;
                _slotRepository.Update(slot);

                // If booking check-in, set booking to Completed
                if (session.BookingId.HasValue)
                {
                    var booking = await _bookingRepository.GetByIdAsync(session.BookingId.Value);
                    if (booking != null)
                    {
                        booking.Status = BookingStatus.Completed;
                        _bookingRepository.Update(booking);
                    }
                }

                // If overstay, log it
                if (feeResult.IsOverstay)
                {
                    var overstayLog = new ExceptionLog
                    {
                        SessionId = session.SessionId,
                        HandledByUserId = staffId,
                        ExceptionType = ExceptionType.Overstay,
                        AdditionalFee = feeResult.PenaltyFee,
                        Description = $"Tự động tạo ExceptionLog Overstay. Thời gian đỗ: {feeResult.DurationMinutes} phút.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _exceptionRepository.AddAsync(overstayLog);
                }

                await _sessionRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                // Map to response
                var response = _mapper.Map<CheckOutResponseDTO>(session);
                response.BaseFee = feeResult.BaseFee;
                response.PenaltyFee = feeResult.PenaltyFee;
                response.TotalFee = feeResult.TotalFee;
                response.DurationMinutes = feeResult.DurationMinutes;
                response.PaymentMethod = request.PaymentMethod;
                response.IsOverstay = feeResult.IsOverstay;
                response.IsLostTicket = false;

                return response;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<ActiveSessionSummaryDTO>> GetActiveSessionsByPlateAsync(string licensePlate, int? staffId = null)
        {
            if (string.IsNullOrWhiteSpace(licensePlate))
            {
                throw new ParkingException("VALIDATION_ERROR", "Biển số xe tìm kiếm không thể trống.", 400);
            }

            var plate = licensePlate.Trim().ToUpper();

            var query = _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .Where(s => s.Status == SessionStatus.Active && s.LicensePlate.Contains(plate));

            if (staffId.HasValue)
            {
                var staff = await _context.AppUsers.FindAsync(staffId.Value);
                if (staff != null && staff.Role == UserRole.Staff && staff.BuildingId.HasValue)
                {
                    query = query.Where(s => s.Slot.Floor.BuildingId == staff.BuildingId.Value);
                }
            }

            var activeSessions = await query.ToListAsync();

            var list = new List<ActiveSessionSummaryDTO>();
            foreach (var s in activeSessions)
            {
                var feeResult = await _feeCalculator.CalculateFeeAsync(s.CheckInTime, DateTime.UtcNow, s.VehicleType, isLostTicket: false);
                var dto = _mapper.Map<ActiveSessionSummaryDTO>(s);
                dto.DurationMinutes = feeResult.DurationMinutes;
                dto.EstimatedFee = feeResult.TotalFee;
                list.Add(dto);
            }

            return list;
        }

        public async Task<CheckOutResponseDTO> ConfirmCheckOutAsync(Guid sessionId, CheckoutConfirmRequest request, int staffId)
        {
            var staff = await _context.AppUsers.FindAsync(staffId);
            if (staff == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Không tìm thấy thông tin nhân viên.", 404);
            }
            if (!staff.BuildingId.HasValue && staff.Role == UserRole.Staff)
            {
                throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc.", 400);
            }

            var session = await _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.Status == SessionStatus.Active);

            if (session == null)
            {
                throw new ParkingException("SESSION_NOT_FOUND", "Không tìm thấy lượt gửi xe đang hoạt động.", 404);
            }

            if (staff.Role == UserRole.Staff && session.Slot.Floor.BuildingId != staff.BuildingId.Value)
            {
                throw new ParkingException("WRONG_BUILDING", "Lượt gửi xe này thuộc tòa nhà khác.", 400);
            }

            // Calculate fees (BR-05) - passing isLostTicket from confirmation request
            var feeResult = await _feeCalculator.CalculateFeeAsync(session.CheckInTime, DateTime.UtcNow, session.VehicleType, isLostTicket: request.IsLostTicket);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Create payment
                var payment = new Payment
                {
                    SessionId = session.SessionId,
                    Amount = feeResult.TotalFee,
                    BaseFee = feeResult.BaseFee,
                    PenaltyFee = feeResult.PenaltyFee,
                    PaymentMethod = request.PaymentMethod,
                    PaidAt = DateTime.UtcNow,
                    ReceivedByStaffId = staffId
                };

                await _paymentRepository.AddAsync(payment);

                // Update session
                session.CheckOutTime = DateTime.UtcNow;
                session.Fee = feeResult.TotalFee;
                session.Status = SessionStatus.Closed;
                session.CheckOutByStaffId = staffId;
                _sessionRepository.Update(session);

                // Free up slot
                var slot = session.Slot;
                slot.Status = SlotStatus.Free;
                _slotRepository.Update(slot);

                // Booking complete
                if (session.BookingId.HasValue)
                {
                    var booking = await _bookingRepository.GetByIdAsync(session.BookingId.Value);
                    if (booking != null)
                    {
                        booking.Status = BookingStatus.Completed;
                        _bookingRepository.Update(booking);
                    }
                }

                // If lost ticket, create ExceptionLog (BR-07.1)
                if (request.IsLostTicket)
                {
                    var lostTicketLog = new ExceptionLog
                    {
                        SessionId = session.SessionId,
                        HandledByUserId = staffId,
                        ExceptionType = ExceptionType.LostTicket,
                        AdditionalFee = feeResult.PenaltyFee, // lost ticket fee + overtime if any
                        Description = "Báo mất vé gửi xe - check out bằng biển số.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _exceptionRepository.AddAsync(lostTicketLog);
                }
                // Else if overstay, log it
                else if (feeResult.IsOverstay)
                {
                    var overstayLog = new ExceptionLog
                    {
                        SessionId = session.SessionId,
                        HandledByUserId = staffId,
                        ExceptionType = ExceptionType.Overstay,
                        AdditionalFee = feeResult.PenaltyFee,
                        Description = $"Tự động tạo ExceptionLog Overstay. Thời gian đỗ: {feeResult.DurationMinutes} phút.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _exceptionRepository.AddAsync(overstayLog);
                }

                await _sessionRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                // Map to response
                var response = _mapper.Map<CheckOutResponseDTO>(session);
                response.BaseFee = feeResult.BaseFee;
                response.PenaltyFee = feeResult.PenaltyFee;
                response.TotalFee = feeResult.TotalFee;
                response.DurationMinutes = feeResult.DurationMinutes;
                response.PaymentMethod = request.PaymentMethod;
                response.IsOverstay = feeResult.IsOverstay;
                response.IsLostTicket = request.IsLostTicket;

                return response;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResult<SessionSummaryDTO>> GetSessionsAsync(SessionStatus? status, DateTime? dateFrom, DateTime? dateTo, VehicleType? vehicleType, int? floorId, string? licensePlate, int page, int pageSize)
        {
            var query = _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(s => s.Status == status.Value);
            }

            if (dateFrom.HasValue)
            {
                query = query.Where(s => s.CheckInTime >= dateFrom.Value);
            }

            if (dateTo.HasValue)
            {
                query = query.Where(s => s.CheckInTime <= dateTo.Value);
            }

            if (vehicleType.HasValue)
            {
                query = query.Where(s => s.VehicleType == vehicleType.Value);
            }

            if (floorId.HasValue)
            {
                query = query.Where(s => s.Slot.FloorId == floorId.Value);
            }

            if (!string.IsNullOrWhiteSpace(licensePlate))
            {
                var plate = licensePlate.Trim().ToUpper();
                query = query.Where(s => s.LicensePlate.Contains(plate));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.CheckInTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<SessionSummaryDTO>>(items);

            return new PagedResult<SessionSummaryDTO>(dtos, totalCount, page, pageSize);
        }

        public async Task<IEnumerable<ActiveSessionSummaryDTO>> GetActiveSessionsAsync(int? floorId, VehicleType? vehicleType)
        {
            var query = _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .Where(s => s.Status == SessionStatus.Active);

            if (floorId.HasValue)
            {
                query = query.Where(s => s.Slot.FloorId == floorId.Value);
            }

            if (vehicleType.HasValue)
            {
                query = query.Where(s => s.VehicleType == vehicleType.Value);
            }

            var sessions = await query.ToListAsync();

            var list = new List<ActiveSessionSummaryDTO>();
            foreach (var s in sessions)
            {
                var feeResult = await _feeCalculator.CalculateFeeAsync(s.CheckInTime, DateTime.UtcNow, s.VehicleType, isLostTicket: false);
                var dto = _mapper.Map<ActiveSessionSummaryDTO>(s);
                dto.DurationMinutes = feeResult.DurationMinutes;
                dto.EstimatedFee = feeResult.TotalFee;
                list.Add(dto);
            }

            return list;
        }

        public async Task<SessionDetailDTO> GetSessionByIdAsync(Guid sessionId)
        {
            var session = await _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .Include(s => s.CheckInStaff)
                .Include(s => s.CheckOutStaff)
                .Include(s => s.Payment)
                .ThenInclude(p => p!.ReceivedByStaff)
                .Include(s => s.ExceptionLogs)
                .ThenInclude(e => e.HandledByUser)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                throw new ParkingException("SESSION_NOT_FOUND", "Lượt gửi xe không tồn tại.", 404);
            }

            var dto = _mapper.Map<SessionDetailDTO>(session);

            // If session is active, calculate estimated fee so far
            if (session.Status == SessionStatus.Active)
            {
                var feeResult = await _feeCalculator.CalculateFeeAsync(session.CheckInTime, DateTime.UtcNow, session.VehicleType, isLostTicket: false);
                dto.DurationMinutes = feeResult.DurationMinutes;
                dto.Fee = feeResult.TotalFee;
            }

            return dto;
        }

        public async Task<CurrentFeeResponseDTO> GetCurrentFeeAsync(Guid sessionId)
        {
            var session = await _sessionRepository.GetByIdAsync(sessionId);
            if (session == null || session.Status != SessionStatus.Active)
            {
                throw new ParkingException("SESSION_NOT_FOUND", "Không tìm thấy lượt gửi xe đang hoạt động.", 404);
            }

            var feeResult = await _feeCalculator.CalculateFeeAsync(session.CheckInTime, DateTime.UtcNow, session.VehicleType, isLostTicket: false);

            return new CurrentFeeResponseDTO
            {
                SessionId = session.SessionId,
                DurationMinutes = feeResult.DurationMinutes,
                EstimatedFee = feeResult.TotalFee,
                IsOverstay = feeResult.IsOverstay
            };
        }

        public async Task<PagedResult<SessionSummaryDTO>> GetMySessionHistoryAsync(int userId, SessionStatus? status, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize)
        {
            var query = _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .ThenInclude(f => f.Building)
                .Where(s => s.UserId == userId);

            if (status.HasValue)
            {
                query = query.Where(s => s.Status == status.Value);
            }

            if (dateFrom.HasValue)
            {
                query = query.Where(s => s.CheckInTime >= dateFrom.Value);
            }

            if (dateTo.HasValue)
            {
                query = query.Where(s => s.CheckInTime <= dateTo.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.CheckInTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<SessionSummaryDTO>>(items);

            return new PagedResult<SessionSummaryDTO>(dtos, totalCount, page, pageSize);
        }

        public async Task<SessionDetailDTO> UpdateLicensePlateAsync(Guid sessionId, UpdateLicensePlateRequest request, int staffId)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                throw new ParkingException("VALIDATION_ERROR", "Lý do cập nhật biển số bắt buộc phải điền.", 400);
            }

            var staff = await _context.AppUsers.FindAsync(staffId);
            if (staff == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Không tìm thấy thông tin nhân viên.", 404);
            }
            if (!staff.BuildingId.HasValue && staff.Role == UserRole.Staff)
            {
                throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc.", 400);
            }

            var session = await _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.Status == SessionStatus.Active);

            if (session == null)
            {
                throw new ParkingException("SESSION_NOT_FOUND", "Không tìm thấy lượt gửi xe đang hoạt động.", 404);
            }

            if (staff.Role == UserRole.Staff && session.Slot.Floor.BuildingId != staff.BuildingId.Value)
            {
                throw new ParkingException("WRONG_BUILDING", "Lượt gửi xe này thuộc tòa nhà khác.", 400);
            }

            // Validate new plate format
            if (!LicensePlateValidator.IsValid(request.NewLicensePlate, session.VehicleType))
            {
                throw new ParkingException("VALIDATION_ERROR", "Biển số xe mới không đúng định dạng quy định.", 400);
            }

            var originalPlate = session.LicensePlate;
            var newPlate = request.NewLicensePlate.Trim().ToUpper();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                session.LicensePlate = newPlate;
                _sessionRepository.Update(session);

                // Create ExceptionLog (BR-07.2)
                var log = new ExceptionLog
                {
                    SessionId = session.SessionId,
                    HandledByUserId = staffId,
                    ExceptionType = ExceptionType.WrongPlate,
                    OriginalValue = originalPlate,
                    NewValue = newPlate,
                    Description = request.Reason,
                    AdditionalFee = 0,
                    CreatedAt = DateTime.UtcNow
                };
                await _exceptionRepository.AddAsync(log);

                await _sessionRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetSessionByIdAsync(sessionId);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SessionDetailDTO> UpdateSlotAsync(Guid sessionId, UpdateSlotRequest request, int staffId)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                throw new ParkingException("VALIDATION_ERROR", "Lý do thay đổi slot bắt buộc phải điền.", 400);
            }

            var staff = await _context.AppUsers.FindAsync(staffId);
            if (staff == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Không tìm thấy thông tin nhân viên.", 404);
            }
            if (!staff.BuildingId.HasValue && staff.Role == UserRole.Staff)
            {
                throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc.", 400);
            }

            var session = await _sessionRepository.GetQueryable()
                .Include(s => s.Slot)
                .ThenInclude(s => s.Floor)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.Status == SessionStatus.Active);

            if (session == null)
            {
                throw new ParkingException("SESSION_NOT_FOUND", "Không tìm thấy lượt gửi xe đang hoạt động.", 404);
            }

            if (staff.Role == UserRole.Staff && session.Slot.Floor.BuildingId != staff.BuildingId.Value)
            {
                throw new ParkingException("WRONG_BUILDING", "Lượt gửi xe này thuộc tòa nhà khác.", 400);
            }

            if (session.SlotId == request.NewSlotId)
            {
                throw new ParkingException("SAME_SLOT", "Slot mới trùng với slot hiện tại.", 400);
            }

            var newSlot = await _slotRepository.GetQueryable()
                .Include(s => s.Floor)
                .FirstOrDefaultAsync(s => s.SlotId == request.NewSlotId);
            if (newSlot == null || newSlot.Status != SlotStatus.Free || !newSlot.IsActive || newSlot.VehicleType != session.VehicleType)
            {
                throw new ParkingException("NEW_SLOT_NOT_AVAILABLE", "Slot mới không trống hoặc không phù hợp với loại xe.", 409);
            }

            if (staff.Role == UserRole.Staff && newSlot.Floor.BuildingId != staff.BuildingId.Value)
            {
                throw new ParkingException("WRONG_BUILDING", "Slot mới phải thuộc cùng tòa nhà của bạn.", 400);
            }

            var oldSlot = session.Slot;
            var oldSlotCode = oldSlot.SlotCode;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Free old slot
                oldSlot.Status = SlotStatus.Free;
                _slotRepository.Update(oldSlot);

                // Lock new slot
                newSlot.Status = SlotStatus.Occupied;
                _slotRepository.Update(newSlot);

                // Update session
                session.SlotId = newSlot.SlotId;
                _sessionRepository.Update(session);

                // Create ExceptionLog (BR-07.4)
                var log = new ExceptionLog
                {
                    SessionId = session.SessionId,
                    HandledByUserId = staffId,
                    ExceptionType = ExceptionType.WrongZone,
                    OriginalValue = oldSlotCode,
                    NewValue = newSlot.SlotCode,
                    Description = request.Reason,
                    AdditionalFee = 0,
                    CreatedAt = DateTime.UtcNow
                };
                await _exceptionRepository.AddAsync(log);

                await _sessionRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetSessionByIdAsync(sessionId);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
