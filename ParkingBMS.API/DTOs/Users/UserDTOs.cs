using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Users
{
    public class CreateUserRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public UserRole Role { get; set; }
        public int? BuildingId { get; set; }
    }

    public class UpdateUserRequest
    {
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
        public int? BuildingId { get; set; }
    }

    public class UserSummaryDTO
    {
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public int? BuildingId { get; set; }
        public string? BuildingName { get; set; }
    }

    public class UserDetailDTO
    {
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public int? BuildingId { get; set; }
        public string? BuildingName { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string NewPassword { get; set; } = null!;
    }

    public class UpdateProfileRequest
    {
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }

    public class UpdatePasswordRequest
    {
        public string CurrentPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}
