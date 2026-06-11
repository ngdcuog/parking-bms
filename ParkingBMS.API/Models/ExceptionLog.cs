using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class ExceptionLog
    {
        public int LogId { get; set; }
        public Guid SessionId { get; set; }
        public int HandledByUserId { get; set; }
        public ExceptionType ExceptionType { get; set; }
        public string? OriginalValue { get; set; }
        public string? NewValue { get; set; }
        public string? Description { get; set; }
        public decimal AdditionalFee { get; set; } = 0m;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual ParkingSession Session { get; set; } = null!;
        public virtual AppUser HandledByUser { get; set; } = null!;
    }
}
