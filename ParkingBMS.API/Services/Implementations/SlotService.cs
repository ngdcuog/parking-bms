using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Data;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class SlotService : ISlotService
    {
        private readonly IRepository<ParkingSlot> _slotRepository;
        private readonly IRepository<ParkingFloor> _floorRepository;
        private readonly IRepository<ParkingSession> _sessionRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public SlotService(
            IRepository<ParkingSlot> slotRepository,
            IRepository<ParkingFloor> floorRepository,
            IRepository<ParkingSession> sessionRepository,
            AppDbContext context,
            IMapper mapper)
        {
            _slotRepository = slotRepository;
            _floorRepository = floorRepository;
            _sessionRepository = sessionRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<PagedResult<SlotDTO>> GetSlotsByFloorIdAsync(int floorId, SlotStatus? status, int page, int pageSize)
        {
            var floor = await _floorRepository.GetByIdAsync(floorId);
            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            var query = _slotRepository.GetQueryable().Where(s => s.FloorId == floorId);

            if (status.HasValue)
            {
                query = query.Where(s => s.Status == status.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(s => s.SlotCode)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<SlotDTO>>(items);

            return new PagedResult<SlotDTO>(dtos, totalCount, page, pageSize);
        }

        public async Task<FloorSlotGridDTO> GetFloorSlotGridAsync(int floorId)
        {
            var floor = await _floorRepository.GetQueryable()
                .Include(f => f.Slots)
                .FirstOrDefaultAsync(f => f.FloorId == floorId);

            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            var activeSlots = floor.Slots.Where(s => s.IsActive).OrderBy(s => s.SlotCode).ToList();

            var dto = new FloorSlotGridDTO
            {
                FloorId = floor.FloorId,
                FloorName = floor.FloorName,
                VehicleType = floor.VehicleType,
                TotalSlots = activeSlots.Count,
                FreeCount = activeSlots.Count(s => s.Status == SlotStatus.Free),
                OccupiedCount = activeSlots.Count(s => s.Status == SlotStatus.Occupied),
                ReservedCount = activeSlots.Count(s => s.Status == SlotStatus.Reserved),
                Slots = _mapper.Map<List<SlotGridDTO>>(activeSlots)
            };

            return dto;
        }

        public async Task<SlotDetailDTO> GetSlotByIdAsync(int slotId)
        {
            var slot = await _slotRepository.GetQueryable()
                .Include(s => s.Floor)
                .FirstOrDefaultAsync(s => s.SlotId == slotId);

            if (slot == null)
            {
                throw new ParkingException("SLOT_NOT_FOUND", "Slot không tồn tại.", 404);
            }

            var dto = _mapper.Map<SlotDetailDTO>(slot);

            if (slot.Status == SlotStatus.Occupied)
            {
                // Retrieve active session details
                var activeSession = await _sessionRepository.GetQueryable()
                    .Include(s => s.CheckInStaff)
                    .FirstOrDefaultAsync(s => s.SlotId == slotId && s.Status == SessionStatus.Active);

                if (activeSession != null)
                {
                    dto.ActiveSession = new ActiveSessionSummaryDTO
                    {
                        SessionId = activeSession.SessionId,
                        LicensePlate = activeSession.LicensePlate,
                        VehicleType = activeSession.VehicleType,
                        SlotCode = slot.SlotCode,
                        FloorName = slot.Floor.FloorName,
                        CheckInTime = activeSession.CheckInTime,
                        DurationMinutes = (int)(DateTime.UtcNow - activeSession.CheckInTime).TotalMinutes,
                        EstimatedFee = 0 // Will be calculated by Session controller/service if requested
                    };
                }
            }

            return dto;
        }

        public async Task<SlotDTO> CreateSlotAsync(int floorId, CreateSlotRequest request)
        {
            var floor = await _floorRepository.GetByIdAsync(floorId);
            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            // Check duplicate slot code in this floor
            var existingSlot = await _slotRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.FloorId == floorId && s.SlotCode == request.SlotCode);

            if (existingSlot != null)
            {
                if (!existingSlot.IsActive)
                {
                    existingSlot.IsActive = true;
                    existingSlot.VehicleType = request.VehicleType;
                    existingSlot.Status = SlotStatus.Free;
                    _slotRepository.Update(existingSlot);

                    floor.TotalSlots += 1;
                    _floorRepository.Update(floor);

                    await _slotRepository.SaveChangesAsync();
                    return _mapper.Map<SlotDTO>(existingSlot);
                }
                else
                {
                    throw new ParkingException("SLOT_CODE_ALREADY_EXISTS", $"Mã slot '{request.SlotCode}' đã tồn tại trên tầng này.", 409);
                }
            }

            var newSlot = new ParkingSlot
            {
                FloorId = floorId,
                SlotCode = request.SlotCode,
                VehicleType = request.VehicleType,
                Status = SlotStatus.Free,
                IsActive = true
            };

            await _slotRepository.AddAsync(newSlot);

            floor.TotalSlots += 1;
            _floorRepository.Update(floor);

            await _slotRepository.SaveChangesAsync();

            return _mapper.Map<SlotDTO>(newSlot);
        }

        public async Task<int> BulkCreateSlotsAsync(int floorId, BulkCreateSlotRequest request)
        {
            var floor = await _floorRepository.GetByIdAsync(floorId);
            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            if (request.StartNumber > request.EndNumber || request.StartNumber < 1)
            {
                throw new ParkingException("VALIDATION_ERROR", "Phạm vi số không hợp lệ.", 400);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int createdCount = 0;
                for (int i = request.StartNumber; i <= request.EndNumber; i++)
                {
                    // Zero padded format: e.g. A01, A02, A10 (as described in spec & Natural Sort rules)
                    var code = $"{request.Prefix}{i:D2}";

                    var existingSlot = await _slotRepository.GetQueryable().IgnoreQueryFilters()
                        .FirstOrDefaultAsync(s => s.FloorId == floorId && s.SlotCode == code);

                    if (existingSlot != null)
                    {
                        if (!existingSlot.IsActive)
                        {
                            existingSlot.IsActive = true;
                            existingSlot.VehicleType = request.VehicleType;
                            existingSlot.Status = SlotStatus.Free;
                            _slotRepository.Update(existingSlot);
                            createdCount++;
                            continue;
                        }
                        else
                        {
                            throw new ParkingException("SLOT_CODE_ALREADY_EXISTS", $"Mã slot '{code}' đã tồn tại trên tầng này.", 409);
                        }
                    }

                    var newSlot = new ParkingSlot
                    {
                        FloorId = floorId,
                        SlotCode = code,
                        VehicleType = request.VehicleType,
                        Status = SlotStatus.Free,
                        IsActive = true
                    };

                    await _slotRepository.AddAsync(newSlot);
                    createdCount++;
                }

                floor.TotalSlots += (short)createdCount;
                _floorRepository.Update(floor);

                await _slotRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return createdCount;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SlotDTO> UpdateSlotStatusAsync(int slotId, SlotStatus status, int? userId = null)
        {
            var slot = await _slotRepository.GetQueryable()
                .Include(s => s.Floor)
                .FirstOrDefaultAsync(s => s.SlotId == slotId);
            if (slot == null)
            {
                throw new ParkingException("SLOT_NOT_FOUND", "Slot không tồn tại.", 404);
            }

            if (userId.HasValue)
            {
                var user = await _context.AppUsers.FindAsync(userId.Value);
                if (user != null && user.Role == UserRole.Staff)
                {
                    if (!user.BuildingId.HasValue)
                    {
                        throw new ParkingException("STAFF_NO_BUILDING", "Tài khoản nhân viên chưa được chỉ định tòa nhà làm việc.", 400);
                    }
                    if (slot.Floor.BuildingId != user.BuildingId.Value)
                    {
                        throw new ParkingException("WRONG_BUILDING", "Bạn không có quyền chỉnh sửa trạng thái ô đỗ thuộc tòa nhà khác.", 403);
                    }
                }
            }

            // Valid transitions: Maintenance(3), Locked(4), or Free(0)
            if (status != SlotStatus.Maintenance && status != SlotStatus.Locked && status != SlotStatus.Free)
            {
                throw new ParkingException("INVALID_STATUS_TRANSITION", "Trạng thái chuyển đổi không hợp lệ. Chỉ có thể cài đặt bảo trì, khóa hoặc mở khóa slot.", 400);
            }

            // Cannot modify if currently Occupied (BR-02.2)
            if (slot.Status == SlotStatus.Occupied)
            {
                throw new ParkingException("SLOT_OCCUPIED", "Slot đang có xe đỗ, vui lòng thực hiện checkout trước khi thay đổi trạng thái.", 409);
            }

            slot.Status = status;
            _slotRepository.Update(slot);
            await _slotRepository.SaveChangesAsync();

            return _mapper.Map<SlotDTO>(slot);
        }

        public async Task<SlotDTO> UpdateSlotAsync(int slotId, EditSlotRequest request)
        {
            var slot = await _slotRepository.GetByIdAsync(slotId);
            if (slot == null)
            {
                throw new ParkingException("SLOT_NOT_FOUND", "Slot không tồn tại.", 404);
            }

            // Cannot modify if occupied or reserved
            if (slot.Status == SlotStatus.Occupied || slot.Status == SlotStatus.Reserved)
            {
                throw new ParkingException("SLOT_OCCUPIED", "Không thể chỉnh sửa thông tin khi slot đang có xe hoạt động hoặc đặt trước.", 409);
            }

            // Check duplicate slot code in this floor
            var existingSlot = await _slotRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.FloorId == slot.FloorId && s.SlotCode == request.SlotCode && s.SlotId != slotId);

            if (existingSlot != null)
            {
                throw new ParkingException("SLOT_CODE_ALREADY_EXISTS", $"Mã slot '{request.SlotCode}' đã tồn tại trên tầng này.", 409);
            }

            slot.SlotCode = request.SlotCode;
            slot.VehicleType = request.VehicleType;

            _slotRepository.Update(slot);
            await _slotRepository.SaveChangesAsync();

            return _mapper.Map<SlotDTO>(slot);
        }

        public async Task DeleteSlotAsync(int slotId)
        {
            var slot = await _slotRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.SlotId == slotId);

            if (slot == null)
            {
                throw new ParkingException("SLOT_NOT_FOUND", "Slot không tồn tại.", 404);
            }

            // Validate that slot does NOT have an active session (BR-12.7 / BR-01.4)
            var hasActiveSession = await _sessionRepository.GetQueryable()
                .AnyAsync(s => s.SlotId == slotId && s.Status == SessionStatus.Active);

            if (hasActiveSession)
            {
                throw new ParkingException("SLOT_HAS_ACTIVE_SESSION", "Không thể xóa slot này vì đang có lượt gửi xe hoạt động.", 409);
            }

            // Soft delete
            slot.IsActive = false;
            _slotRepository.Update(slot);

            // Update Floor total slot count
            var floor = await _floorRepository.GetByIdAsync(slot.FloorId);
            if (floor != null)
            {
                floor.TotalSlots -= 1;
                _floorRepository.Update(floor);
            }

            await _slotRepository.SaveChangesAsync();
        }

        public async Task DeleteAllSlotsByFloorIdAsync(int floorId)
        {
            var floor = await _floorRepository.GetQueryable()
                .Include(f => f.Slots)
                .FirstOrDefaultAsync(f => f.FloorId == floorId);

            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            // Check if any active slots are Occupied or Reserved
            var hasActiveSlots = floor.Slots.Any(s => 
                s.IsActive && 
                (s.Status == SlotStatus.Occupied || s.Status == SlotStatus.Reserved));

            if (hasActiveSlots)
            {
                throw new ParkingException("FLOOR_HAS_ACTIVE_SLOTS", 
                    "Không thể xóa các ô đỗ xe khi đang có xe hoạt động hoặc lịch đặt trước.", 409);
            }

            // Soft delete all active slots on this floor
            var activeSlots = floor.Slots.Where(s => s.IsActive).ToList();
            foreach (var slot in activeSlots)
            {
                slot.IsActive = false;
                _slotRepository.Update(slot);
            }

            // Reset Floor total slots count
            floor.TotalSlots = 0;
            _floorRepository.Update(floor);

            await _slotRepository.SaveChangesAsync();
        }
    }
}
