using System;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.DTOs.Auth;
using ParkingBMS.API.DTOs.Users;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly IRepository<AppUser> _userRepository;
        private readonly JwtHelper _jwtHelper;
        private readonly IMapper _mapper;

        public AuthService(IRepository<AppUser> userRepository, JwtHelper jwtHelper, IMapper mapper)
        {
            _userRepository = userRepository;
            _jwtHelper = jwtHelper;
            _mapper = mapper;
        }

        public async Task<(LoginResponse response, string refreshToken)> LoginAsync(LoginRequest request)
        {
            var user = await _userRepository.GetQueryable()
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null || !PasswordHelper.VerifyPassword(request.Password, user.PasswordHash))
            {
                throw new ParkingException("INVALID_CREDENTIALS", "Sai tài khoản hoặc mật khẩu.", 401);
            }

            // Generate tokens
            var accessToken = _jwtHelper.GenerateAccessToken(user);
            var refreshTokenRaw = _jwtHelper.GenerateRefreshToken();
            var refreshTokenHash = _jwtHelper.HashRefreshToken(refreshTokenRaw);

            // Save refresh token to user
            user.RefreshTokenHash = refreshTokenHash;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            user.RefreshTokenRevoked = false;
            user.LastLoginAt = DateTime.UtcNow;

            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            var loginResponse = _mapper.Map<LoginResponse>(user);
            loginResponse.AccessToken = accessToken;

            return (loginResponse, refreshTokenRaw);
        }

        public async Task<UserDetailDTO> RegisterAsync(RegisterRequest request)
        {
            // Validate username and email uniqueness
            var existingUser = (await _userRepository.FindAsync(u => u.Username == request.Username))
                .FirstOrDefault();
            if (existingUser != null)
            {
                throw new ParkingException("USERNAME_ALREADY_EXISTS", "Tên đăng nhập đã tồn tại.", 409);
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var existingEmail = (await _userRepository.FindAsync(u => u.Email == request.Email))
                    .FirstOrDefault();
                if (existingEmail != null)
                {
                    throw new ParkingException("EMAIL_ALREADY_EXISTS", "Email đã tồn tại.", 409);
                }
            }

            // Create new user (Role: ParkingUser = 3)
            var newUser = new AppUser
            {
                Username = request.Username,
                PasswordHash = PasswordHelper.HashPassword(request.Password),
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                Role = UserRole.ParkingUser,
                IsActive = true
            };

            await _userRepository.AddAsync(newUser);
            await _userRepository.SaveChangesAsync();

            return _mapper.Map<UserDetailDTO>(newUser);
        }

        public async Task<LoginResponse> RefreshTokenAsync(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken))
            {
                throw new ParkingException("REFRESH_TOKEN_INVALID", "Refresh token không hợp lệ.", 401);
            }

            var tokenHash = _jwtHelper.HashRefreshToken(refreshToken);

            var user = await _userRepository.GetQueryable()
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.RefreshTokenHash == tokenHash && u.IsActive);

            if (user == null || user.RefreshTokenRevoked || user.RefreshTokenExpiry < DateTime.UtcNow)
            {
                throw new ParkingException("REFRESH_TOKEN_INVALID", "Refresh token không hợp lệ hoặc đã hết hạn.", 401);
            }

            // Generate new access token
            var accessToken = _jwtHelper.GenerateAccessToken(user);

            var loginResponse = _mapper.Map<LoginResponse>(user);
            loginResponse.AccessToken = accessToken;

            return loginResponse;
        }

        public async Task LogoutAsync(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken)) return;

            var tokenHash = _jwtHelper.HashRefreshToken(refreshToken);

            var user = (await _userRepository.FindAsync(u => u.RefreshTokenHash == tokenHash))
                .FirstOrDefault();

            if (user != null)
            {
                user.RefreshTokenRevoked = true;
                _userRepository.Update(user);
                await _userRepository.SaveChangesAsync();
            }
        }

        public async Task<UserDetailDTO> GetMeAsync(int userId)
        {
            var user = await _userRepository.GetQueryable()
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.UserId == userId && u.IsActive);
                
            if (user == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Người dùng không tồn tại hoặc bị khóa.", 404);
            }

            return _mapper.Map<UserDetailDTO>(user);
        }
    }
}
