using System.Threading.Tasks;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Users;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Services.Interfaces
{
    public interface IUserService
    {
        Task<PagedResult<UserSummaryDTO>> GetUsersAsync(UserRole? role, bool? isActive, string? search, int page, int pageSize, int currentUserId, UserRole currentRole);
        Task<UserDetailDTO> GetUserByIdAsync(int id, int currentUserId, UserRole currentRole);
        Task<UserDetailDTO> CreateUserAsync(CreateUserRequest request, UserRole currentRole);
        Task<UserDetailDTO> UpdateUserAsync(int id, UpdateUserRequest request, UserRole currentRole);
        Task ResetPasswordAsync(int id, string newPassword, UserRole currentRole);
        Task<UserDetailDTO> UpdateProfileAsync(int userId, UpdateProfileRequest request);
        Task UpdatePasswordAsync(int userId, UpdatePasswordRequest request);
    }
}
