using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Users;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize]
    public class UsersController : BaseApiController
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<PagedResult<UserSummaryDTO>>>> GetUsers(
            [FromQuery] UserRole? role,
            [FromQuery] bool? isActive,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _userService.GetUsersAsync(role, isActive, search, page, pageSize, CurrentUserId, CurrentUserRole);
            return Ok(ApiResponse<PagedResult<UserSummaryDTO>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<UserDetailDTO>>> GetUserById(int id)
        {
            var result = await _userService.GetUserByIdAsync(id, CurrentUserId, CurrentUserRole);
            return Ok(ApiResponse<UserDetailDTO>.SuccessResponse(result));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<UserDetailDTO>>> CreateUser([FromBody] CreateUserRequest request)
        {
            var result = await _userService.CreateUserAsync(request, CurrentUserRole);
            return Ok(ApiResponse<UserDetailDTO>.SuccessResponse(result, "Tạo tài khoản thành công."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<UserDetailDTO>>> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var result = await _userService.UpdateUserAsync(id, request, CurrentUserRole);
            return Ok(ApiResponse<UserDetailDTO>.SuccessResponse(result, "Cập nhật tài khoản thành công."));
        }

        [HttpPut("{id}/reset-password")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ApiResponse<object>>> ResetPassword(int id, [FromBody] ResetPasswordRequest request)
        {
            await _userService.ResetPasswordAsync(id, request.NewPassword, CurrentUserRole);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Đặt lại mật khẩu thành công."));
        }

        [HttpPut("me/profile")]
        public async Task<ActionResult<ApiResponse<UserDetailDTO>>> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var result = await _userService.UpdateProfileAsync(CurrentUserId, request);
            return Ok(ApiResponse<UserDetailDTO>.SuccessResponse(result, "Cập nhật hồ sơ cá nhân thành công."));
        }

        [HttpPut("me/password")]
        public async Task<ActionResult<ApiResponse<object>>> UpdatePassword([FromBody] UpdatePasswordRequest request)
        {
            await _userService.UpdatePasswordAsync(CurrentUserId, request);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Thay đổi mật khẩu thành công."));
        }
    }
}
