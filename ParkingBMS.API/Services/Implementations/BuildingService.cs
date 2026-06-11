using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.DTOs.Buildings;
using ParkingBMS.API.DTOs.Floors;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class BuildingService : IBuildingService
    {
        private readonly IRepository<ParkingBuilding> _buildingRepository;
        private readonly IRepository<ParkingFloor> _floorRepository;
        private readonly IRepository<ParkingSlot> _slotRepository;
        private readonly IMapper _mapper;

        public BuildingService(
            IRepository<ParkingBuilding> buildingRepository,
            IRepository<ParkingFloor> floorRepository,
            IRepository<ParkingSlot> slotRepository,
            IMapper mapper)
        {
            _buildingRepository = buildingRepository;
            _floorRepository = floorRepository;
            _slotRepository = slotRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<BuildingDTO>> GetBuildingsAsync()
        {
            var buildings = await _buildingRepository.GetAllAsync();
            return _mapper.Map<List<BuildingDTO>>(buildings);
        }

        public async Task<BuildingDetailDTO> GetBuildingByIdAsync(int id)
        {
            var building = await _buildingRepository.GetQueryable()
                .Include(b => b.Floors)
                .FirstOrDefaultAsync(b => b.BuildingId == id);

            if (building == null)
            {
                throw new ParkingException("BUILDING_NOT_FOUND", "Tòa nhà không tồn tại.", 404);
            }

            return _mapper.Map<BuildingDetailDTO>(building);
        }

        public async Task<IEnumerable<BuildingPublicInfoDTO>> GetBuildingsPublicInfoAsync()
        {
            var buildings = await _buildingRepository.GetQueryable()
                .Include(b => b.Floors)
                .ThenInclude(f => f.Slots)
                .ToListAsync();

            var result = new List<BuildingPublicInfoDTO>();

            foreach (var b in buildings)
            {
                var publicInfo = _mapper.Map<BuildingPublicInfoDTO>(b);
                
                // Calculate free slots count
                var allSlots = b.Floors.SelectMany(f => f.Slots).Where(s => s.IsActive && s.Status == SlotStatus.Free).ToList();
                publicInfo.FreeSlots = new FreeSlotsCount
                {
                    Motorbike = allSlots.Count(s => s.VehicleType == VehicleType.Motorbike),
                    Car = allSlots.Count(s => s.VehicleType == VehicleType.Car),
                    Truck = allSlots.Count(s => s.VehicleType == VehicleType.Truck)
                };

                result.Add(publicInfo);
            }

            return result;
        }

        public async Task<BuildingDTO> CreateBuildingAsync(CreateBuildingRequest request)
        {
            var newBuilding = new ParkingBuilding
            {
                BuildingName = request.BuildingName,
                Address = request.Address,
                OpenTime = request.OpenTime,
                CloseTime = request.CloseTime,
                ContactPhone = request.ContactPhone,
                IsActive = true
            };

            await _buildingRepository.AddAsync(newBuilding);
            await _buildingRepository.SaveChangesAsync();

            return _mapper.Map<BuildingDTO>(newBuilding);
        }

        public async Task<BuildingDTO> UpdateBuildingAsync(int id, UpdateBuildingRequest request)
        {
            var building = await _buildingRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.BuildingId == id);

            if (building == null)
            {
                throw new ParkingException("BUILDING_NOT_FOUND", "Tòa nhà không tồn tại.", 404);
            }

            building.BuildingName = request.BuildingName;
            building.Address = request.Address;
            building.OpenTime = request.OpenTime;
            building.CloseTime = request.CloseTime;
            building.ContactPhone = request.ContactPhone;
            building.IsActive = request.IsActive;

            _buildingRepository.Update(building);
            await _buildingRepository.SaveChangesAsync();

            return _mapper.Map<BuildingDTO>(building);
        }

        public async Task<IEnumerable<FloorDTO>> GetFloorsByBuildingIdAsync(int buildingId)
        {
            var building = await _buildingRepository.GetByIdAsync(buildingId);
            if (building == null)
            {
                throw new ParkingException("BUILDING_NOT_FOUND", "Tòa nhà không tồn tại.", 404);
            }

            var floors = await _floorRepository.GetQueryable()
                .Include(f => f.Slots)
                .Where(f => f.BuildingId == buildingId)
                .ToListAsync();

            var dtos = new List<FloorDTO>();
            foreach (var f in floors)
            {
                var dto = _mapper.Map<FloorDTO>(f);
                dto.FreeSlots = f.Slots.Count(s => s.Status == SlotStatus.Free && s.IsActive);
                dto.OccupiedSlots = f.Slots.Count(s => s.Status == SlotStatus.Occupied && s.IsActive);
                dto.ReservedSlots = f.Slots.Count(s => s.Status == SlotStatus.Reserved && s.IsActive);
                dto.MaintenanceSlots = f.Slots.Count(s => s.Status == SlotStatus.Maintenance && s.IsActive);
                dto.LockedSlots = f.Slots.Count(s => s.Status == SlotStatus.Locked && s.IsActive);
                dtos.Add(dto);
            }

            return dtos;
        }

        public async Task<FloorDTO> GetFloorByIdAsync(int floorId)
        {
            var floor = await _floorRepository.GetQueryable()
                .Include(f => f.Slots)
                .FirstOrDefaultAsync(f => f.FloorId == floorId);

            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            var dto = _mapper.Map<FloorDTO>(floor);
            dto.FreeSlots = floor.Slots.Count(s => s.Status == SlotStatus.Free && s.IsActive);
            dto.OccupiedSlots = floor.Slots.Count(s => s.Status == SlotStatus.Occupied && s.IsActive);
            dto.ReservedSlots = floor.Slots.Count(s => s.Status == SlotStatus.Reserved && s.IsActive);
            dto.MaintenanceSlots = floor.Slots.Count(s => s.Status == SlotStatus.Maintenance && s.IsActive);
            dto.LockedSlots = floor.Slots.Count(s => s.Status == SlotStatus.Locked && s.IsActive);

            return dto;
        }

        public async Task<FloorDTO> CreateFloorAsync(int buildingId, CreateFloorRequest request)
        {
            var building = await _buildingRepository.GetByIdAsync(buildingId);
            if (building == null)
            {
                throw new ParkingException("BUILDING_NOT_FOUND", "Tòa nhà không tồn tại.", 404);
            }

            // Check floor number uniqueness
            var existingFloor = await _floorRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(f => f.BuildingId == buildingId && f.FloorNumber == request.FloorNumber);
            if (existingFloor != null)
            {
                throw new ParkingException("FLOOR_NUMBER_EXISTS", "Số tầng đã tồn tại trong tòa nhà này.", 409);
            }

            var newFloor = new ParkingFloor
            {
                BuildingId = buildingId,
                FloorName = request.FloorName,
                FloorNumber = request.FloorNumber,
                VehicleType = request.VehicleType,
                TotalSlots = 0,
                Description = request.Description,
                IsActive = true
            };

            await _floorRepository.AddAsync(newFloor);
            await _floorRepository.SaveChangesAsync();

            return _mapper.Map<FloorDTO>(newFloor);
        }

        public async Task<FloorDTO> UpdateFloorAsync(int floorId, UpdateFloorRequest request)
        {
            var floor = await _floorRepository.GetQueryable().IgnoreQueryFilters()
                .Include(f => f.Slots)
                .FirstOrDefaultAsync(f => f.FloorId == floorId);

            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            // Changing vehicle type restriction
            if (request.VehicleType != floor.VehicleType)
            {
                // Validate that no slots are Occupied or Reserved (BR-01.3)
                var hasActiveSlots = floor.Slots.Any(s => 
                    s.IsActive && 
                    (s.Status == SlotStatus.Occupied || s.Status == SlotStatus.Reserved));

                if (hasActiveSlots)
                {
                    throw new ParkingException("FLOOR_HAS_ACTIVE_SLOTS", 
                        "Không thể thay đổi loại xe của tầng khi đang có xe đỗ hoặc có lịch đặt trước.", 409);
                }

                // If valid, update all slots' VehicleType to match the floor's new vehicle type
                foreach (var slot in floor.Slots)
                {
                    slot.VehicleType = request.VehicleType;
                    _slotRepository.Update(slot);
                }
            }

            floor.FloorName = request.FloorName;
            floor.VehicleType = request.VehicleType;
            floor.Description = request.Description;
            floor.IsActive = request.IsActive;

            _floorRepository.Update(floor);
            await _floorRepository.SaveChangesAsync();

            var dto = _mapper.Map<FloorDTO>(floor);
            dto.FreeSlots = floor.Slots.Count(s => s.Status == SlotStatus.Free && s.IsActive);
            dto.OccupiedSlots = floor.Slots.Count(s => s.Status == SlotStatus.Occupied && s.IsActive);
            dto.ReservedSlots = floor.Slots.Count(s => s.Status == SlotStatus.Reserved && s.IsActive);
            dto.MaintenanceSlots = floor.Slots.Count(s => s.Status == SlotStatus.Maintenance && s.IsActive);
            dto.LockedSlots = floor.Slots.Count(s => s.Status == SlotStatus.Locked && s.IsActive);

            return dto;
        }

        public async Task DeleteFloorAsync(int floorId)
        {
            var floor = await _floorRepository.GetQueryable().IgnoreQueryFilters()
                .Include(f => f.Slots)
                .FirstOrDefaultAsync(f => f.FloorId == floorId);

            if (floor == null)
            {
                throw new ParkingException("FLOOR_NOT_FOUND", "Tầng không tồn tại.", 404);
            }

            // Check if there are any slots on this floor that are Occupied or Reserved
            var hasActiveSlots = floor.Slots.Any(s => 
                s.IsActive && 
                (s.Status == SlotStatus.Occupied || s.Status == SlotStatus.Reserved));

            if (hasActiveSlots)
            {
                throw new ParkingException("FLOOR_HAS_ACTIVE_SLOTS", 
                    "Không thể xóa tầng khi đang có ô đỗ xe có xe hoạt động hoặc lịch đặt trước.", 409);
            }

            // Soft delete the floor
            floor.IsActive = false;
            _floorRepository.Update(floor);

            // Soft delete all slots belonging to this floor
            foreach (var slot in floor.Slots)
            {
                slot.IsActive = false;
                _slotRepository.Update(slot);
            }

            await _floorRepository.SaveChangesAsync();
        }

        public async Task DeleteBuildingAsync(int buildingId)
        {
            var building = await _buildingRepository.GetQueryable().IgnoreQueryFilters()
                .Include(b => b.Floors)
                .ThenInclude(f => f.Slots)
                .FirstOrDefaultAsync(b => b.BuildingId == buildingId);

            if (building == null)
            {
                throw new ParkingException("BUILDING_NOT_FOUND", "Tòa nhà không tồn tại.", 404);
            }

            // Check if there are any slots in the building that are Occupied or Reserved
            var hasActiveSlots = building.Floors.SelectMany(f => f.Slots).Any(s => 
                s.IsActive && 
                (s.Status == SlotStatus.Occupied || s.Status == SlotStatus.Reserved));

            if (hasActiveSlots)
            {
                throw new ParkingException("BUILDING_HAS_ACTIVE_SLOTS", 
                    "Không thể xóa tòa nhà khi đang có ô đỗ xe có xe hoạt động hoặc lịch đặt trước.", 409);
            }

            // Soft delete the building
            building.IsActive = false;
            _buildingRepository.Update(building);

            // Soft delete all floors and their slots
            foreach (var floor in building.Floors)
            {
                floor.IsActive = false;
                _floorRepository.Update(floor);

                foreach (var slot in floor.Slots)
                {
                    slot.IsActive = false;
                    _slotRepository.Update(slot);
                }
            }

            await _buildingRepository.SaveChangesAsync();
        }
    }
}
