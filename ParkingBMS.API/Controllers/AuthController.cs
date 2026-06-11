using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Auth;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Users;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Controllers
{
    public class AuthController : BaseApiController
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
        {
            var (response, refreshToken) = await _authService.LoginAsync(request);

            // Set HttpOnly Cookie for Refresh Token (JWT Refresh rule)
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Set to true in prod, but fine for development in modern browsers
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/api/v1/auth" // restrict path
            };

            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);

            return Ok(ApiResponse<LoginResponse>.SuccessResponse(response));
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<UserDetailDTO>>> Register([FromBody] RegisterRequest request)
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(ApiResponse<UserDetailDTO>.SuccessResponse(response, "Đăng ký tài khoản thành công."));
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<RefreshResponse>>> Refresh()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized(ApiResponse<object>.FailResponse("REFRESH_TOKEN_INVALID", "Không tìm thấy refresh token trong cookie."));
            }

            var response = await _authService.RefreshTokenAsync(refreshToken);
            
            var refreshResponse = new RefreshResponse { AccessToken = response.AccessToken };
            return Ok(ApiResponse<RefreshResponse>.SuccessResponse(refreshResponse));
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<object>>> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                await _authService.LogoutAsync(refreshToken);
                Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/api/v1/auth" });
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Đã đăng xuất thành công."));
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<UserDetailDTO>>> Me()
        {
            var response = await _authService.GetMeAsync(CurrentUserId);
            return Ok(ApiResponse<UserDetailDTO>.SuccessResponse(response));
        }
    }
}
