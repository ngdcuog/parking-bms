using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Payments
{
    public class PaymentDTO
    {
        public int PaymentId { get; set; }
        public Guid SessionId { get; set; }
        public decimal Amount { get; set; }
        public decimal BaseFee { get; set; }
        public decimal PenaltyFee { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public DateTime PaidAt { get; set; }
        public string ReceivedByStaffName { get; set; } = null!;
    }
}
