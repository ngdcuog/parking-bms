using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Auth;
using ParkingBMS.API.DTOs.Users;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<(LoginResponse response, string refreshToken)> LoginAsync(LoginRequest request);
        Task<UserDetailDTO> RegisterAsync(RegisterRequest request);
        Task<LoginResponse> RefreshTokenAsync(string refreshToken);
        Task LogoutAsync(string refreshToken);
        Task<UserDetailDTO> GetMeAsync(int userId);
    }
}
