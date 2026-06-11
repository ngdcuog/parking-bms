using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ParkingBMS.API.Data;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class SlotAllocationService : ISlotAllocationService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public SlotAllocationService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<(ParkingSlot slot, string scoreNote)> AllocateSlotAsync(VehicleType vehicleType, int? buildingId = null)
        {
            // Read AI weights from config (BR-08.2)
            double w1 = double.Parse(_configuration["AI:WeightDistance"] ?? "0.3");
            double w2 = double.Parse(_configuration["AI:WeightFloorBalance"] ?? "0.6");
            double w3 = double.Parse(_configuration["AI:WeightVehicleMatch"] ?? "0.1");

            // Fetch all active slots that support this vehicle type
            var query = _context.ParkingSlots
                .Include(s => s.Floor)
                .Where(s => s.IsActive && s.Floor.IsActive && s.VehicleType == vehicleType);

            if (buildingId.HasValue)
            {
                query = query.Where(s => s.Floor.BuildingId == buildingId.Value);
            }

            var activeSlots = await query.ToListAsync();

            var freeSlots = activeSlots.Where(s => s.Status == SlotStatus.Free).ToList();

            if (!freeSlots.Any())
            {
                throw new ParkingException("NO_SLOT_AVAILABLE", "Bãi xe đã hết chỗ trống phù hợp.", 404);
            }

            // Calculate occupancy metrics per floor
            var floorMetrics = activeSlots
                .GroupBy(s => s.FloorId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        TotalActiveInFloor = g.Count(),
                        OccupiedInFloor = g.Count(s => s.Status == SlotStatus.Occupied || s.Status == SlotStatus.Reserved)
                    }
                );

            ParkingSlot? bestSlot = null;
            double bestScore = -1.0;

            foreach (var slot in freeSlots)
            {
                // 1. Distance Score: based on alphabetical index of SlotCode ASC among active slots on floor
                var floorActiveSlots = activeSlots
                    .Where(s => s.FloorId == slot.FloorId)
                    .OrderBy(s => s.SlotCode, StringComparer.OrdinalIgnoreCase)
                    .ToList();

                int slotIndex = floorActiveSlots.IndexOf(slot);
                int totalSlotsInFloor = floorActiveSlots.Count;

                // Handle division by zero edge case (Appendix G)
                double distanceScore = totalSlotsInFloor > 0 
                    ? 1.0 - ((double)slotIndex / totalSlotsInFloor) 
                    : 1.0;

                // 2. Floor Balance Score
                double floorBalanceScore = 1.0;
                if (floorMetrics.TryGetValue(slot.FloorId, out var metrics))
                {
                    // Handle division by zero edge case (Appendix G)
                    floorBalanceScore = metrics.TotalActiveInFloor > 0
                        ? 1.0 - ((double)metrics.OccupiedInFloor / metrics.TotalActiveInFloor)
                        : 1.0;
                }

                // 3. Vehicle Match Score
                double vehicleMatchScore = 1.0; // Filtered in query already

                // Overall score
                double score = (w1 * distanceScore) + (w2 * floorBalanceScore) + (w3 * vehicleMatchScore);

                // Select maximum score. Tie-break: lowest SlotId (deterministic)
                if (score > bestScore)
                {
                    bestScore = score;
                    bestSlot = slot;
                }
                else if (Math.Abs(score - bestScore) < 0.0001 && bestSlot != null && slot.SlotId < bestSlot.SlotId)
                {
                    bestSlot = slot;
                }
            }

            if (bestSlot == null)
            {
                throw new ParkingException("NO_SLOT_AVAILABLE", "Bãi xe đã hết chỗ trống phù hợp.", 404);
            }

            // Create allocation details JSON (BR-08.4)
            var noteObj = new
            {
                aiScore = Math.Round(bestScore, 4),
                w1 = w1,
                w2 = w2,
                w3 = w3,
                allocatedByAI = true
            };
            string scoreNote = JsonSerializer.Serialize(noteObj);

            return (bestSlot, scoreNote);
        }
    }
}
