using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class Payment
    {
        public int PaymentId { get; set; }
        public Guid SessionId { get; set; }
        public decimal Amount { get; set; }
        public decimal BaseFee { get; set; }
        public decimal PenaltyFee { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
        public DateTime PaidAt { get; set; } = DateTime.UtcNow;
        public int ReceivedByStaffId { get; set; }

        // Navigation properties
        public virtual ParkingSession Session { get; set; } = null!;
        public virtual AppUser ReceivedByStaff { get; set; } = null!;
    }
}
