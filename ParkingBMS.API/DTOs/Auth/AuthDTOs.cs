using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Auth
{
    public class LoginRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class LoginResponse
    {
        public int UserId { get; set; }
        public string Username { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public UserRole Role { get; set; }
        public string AccessToken { get; set; } = null!;
        public int? BuildingId { get; set; }
        public string? BuildingName { get; set; }
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }

    public class RefreshResponse
    {
        public string AccessToken { get; set; } = null!;
    }
}
