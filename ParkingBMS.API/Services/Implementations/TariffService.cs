using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.Data;
using ParkingBMS.API.DTOs.Tariffs;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class TariffService : ITariffService
    {
        private readonly IRepository<TariffConfig> _tariffRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public TariffService(
            IRepository<TariffConfig> tariffRepository,
            AppDbContext context,
            IMapper mapper)
        {
            _tariffRepository = tariffRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<TariffDTO>> GetTariffsAsync(VehicleType? vehicleType, bool? isActive)
        {
            var query = _tariffRepository.GetQueryable().IgnoreQueryFilters();

            if (vehicleType.HasValue)
            {
                query = query.Where(t => t.VehicleType == vehicleType.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            var items = await query.OrderByDescending(t => t.EffectiveFrom).ToListAsync();
            return _mapper.Map<List<TariffDTO>>(items);
        }

        public async Task<IEnumerable<TariffDTO>> GetActiveTariffsAsync()
        {
            var items = await _tariffRepository.GetQueryable()
                .Where(t => t.IsActive)
                .ToListAsync();

            return _mapper.Map<List<TariffDTO>>(items);
        }

        public async Task<TariffDTO> GetTariffByIdAsync(int id)
        {
            var item = await _tariffRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.TariffId == id);

            if (item == null)
            {
                throw new ParkingException("TARIFF_NOT_FOUND", "Bảng giá không tồn tại.", 404);
            }

            return _mapper.Map<TariffDTO>(item);
        }

        public async Task<TariffDTO> CreateTariffAsync(CreateTariffRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Deactivate any existing active tariffs for the same VehicleType (BR-05.1 / BR-12.7)
                var activeTariffs = await _tariffRepository.GetQueryable()
                    .Where(t => t.IsActive && t.VehicleType == request.VehicleType)
                    .ToListAsync();

                foreach (var active in activeTariffs)
                {
                    active.IsActive = false;
                    _tariffRepository.Update(active);
                }

                var newTariff = new TariffConfig
                {
                    VehicleType = request.VehicleType,
                    PricePerHour = request.PricePerHour,
                    PeakHourRate = request.PeakHourRate,
                    PeakStartTime = request.PeakStartTime,
                    PeakEndTime = request.PeakEndTime,
                    DailyMaxFee = request.DailyMaxFee,
                    LostTicketFee = request.LostTicketFee,
                    OvertimeHourThreshold = request.OvertimeHourThreshold,
                    OvertimeFeeRate = request.OvertimeFeeRate,
                    EffectiveFrom = request.EffectiveFrom == default ? DateTime.UtcNow : request.EffectiveFrom,
                    IsActive = true
                };

                await _tariffRepository.AddAsync(newTariff);
                await _tariffRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return _mapper.Map<TariffDTO>(newTariff);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<TariffDTO> UpdateTariffStatusAsync(int id, bool isActive)
        {
            var item = await _tariffRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.TariffId == id);

            if (item == null)
            {
                throw new ParkingException("TARIFF_NOT_FOUND", "Bảng giá không tồn tại.", 404);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (isActive)
                {
                    // Deactivate others first
                    var activeTariffs = await _tariffRepository.GetQueryable()
                        .Where(t => t.IsActive && t.VehicleType == item.VehicleType && t.TariffId != id)
                        .ToListAsync();

                    foreach (var active in activeTariffs)
                    {
                        active.IsActive = false;
                        _tariffRepository.Update(active);
                    }
                }

                item.IsActive = isActive;
                _tariffRepository.Update(item);
                await _tariffRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                return _mapper.Map<TariffDTO>(item);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
