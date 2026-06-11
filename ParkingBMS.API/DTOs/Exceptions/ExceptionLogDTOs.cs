using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Exceptions
{
    public class ExceptionLogDTO
    {
        public int LogId { get; set; }
        public Guid SessionId { get; set; }
        public string HandledByName { get; set; } = null!;
        public ExceptionType ExceptionType { get; set; }
        public string? OriginalValue { get; set; }
        public string? NewValue { get; set; }
        public string? Description { get; set; }
        public decimal AdditionalFee { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
