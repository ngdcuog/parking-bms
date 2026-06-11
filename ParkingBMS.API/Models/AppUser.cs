using System;
using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Models
{
    public class AppUser
    {
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public UserRole Role { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }

        // Refresh Token fields (simple implementation as requested in spec)
        public string? RefreshTokenHash { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public bool RefreshTokenRevoked { get; set; }

        // Associated Building (For Staff role)
        public int? BuildingId { get; set; }
        public virtual ParkingBuilding? Building { get; set; }

        // Navigation properties
        public virtual ICollection<ParkingSession> UserSessions { get; set; } = new List<ParkingSession>();
        public virtual ICollection<ParkingSession> CheckedInSessionsByStaff { get; set; } = new List<ParkingSession>();
        public virtual ICollection<ParkingSession> CheckedOutSessionsByStaff { get; set; } = new List<ParkingSession>();
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<Payment> PaymentsReceived { get; set; } = new List<Payment>();
        public virtual ICollection<ExceptionLog> ExceptionLogsHandled { get; set; } = new List<ExceptionLog>();
    }
}
