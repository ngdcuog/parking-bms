using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Users;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;
using ParkingBMS.API.Services.Interfaces;

namespace ParkingBMS.API.Services.Implementations
{
    public class UserService : IUserService
    {
        private readonly IRepository<AppUser> _userRepository;
        private readonly IMapper _mapper;

        public UserService(IRepository<AppUser> userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<PagedResult<UserSummaryDTO>> GetUsersAsync(UserRole? role, bool? isActive, string? search, int page, int pageSize, int currentUserId, UserRole currentRole)
        {
            var query = _userRepository.GetQueryable().Include(u => u.Building).IgnoreQueryFilters();

            // Role filtering based on Current User Role
            if (currentRole == UserRole.Manager)
            {
                // Manager only sees Staff and ParkingUser
                query = query.Where(u => u.Role == UserRole.Staff || u.Role == UserRole.ParkingUser);
            }

            if (role.HasValue)
            {
                query = query.Where(u => u.Role == role.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u => u.Username.ToLower().Contains(s) || u.FullName.ToLower().Contains(s));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<UserSummaryDTO>>(items);

            return new PagedResult<UserSummaryDTO>(dtos, totalCount, page, pageSize);
        }

        public async Task<UserDetailDTO> GetUserByIdAsync(int id, int currentUserId, UserRole currentRole)
        {
            var user = await _userRepository.GetQueryable().Include(u => u.Building).IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (user == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Người dùng không tồn tại.", 404);
            }

            // Manager cannot view Admin or Manager accounts
            if (currentRole == UserRole.Manager && (user.Role == UserRole.Admin || user.Role == UserRole.Manager))
            {
                throw new ParkingException("FORBIDDEN", "Bạn không có quyền xem tài khoản này.", 403);
            }

            return _mapper.Map<UserDetailDTO>(user);
        }

        public async Task<UserDetailDTO> CreateUserAsync(CreateUserRequest request, UserRole currentRole)
        {
            // Validate username and email uniqueness
            var existingUser = await _userRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Username == request.Username);
            if (existingUser != null)
            {
                throw new ParkingException("USERNAME_ALREADY_EXISTS", "Tên đăng nhập đã tồn tại.", 409);
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var existingEmail = await _userRepository.GetQueryable().IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email == request.Email);
                if (existingEmail != null)
                {
                    throw new ParkingException("EMAIL_ALREADY_EXISTS", "Email đã tồn tại.", 409);
                }
            }

            // Manager can ONLY create Staff accounts
            if (currentRole == UserRole.Manager && request.Role != UserRole.Staff)
            {
                throw new ParkingException("FORBIDDEN_ROLE", "Quản lý chỉ có quyền tạo tài khoản Nhân viên (Staff).", 403);
            }

            var newUser = new AppUser
            {
                Username = request.Username,
                PasswordHash = PasswordHelper.HashPassword(request.Password),
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                Role = request.Role,
                BuildingId = request.Role == UserRole.Staff ? request.BuildingId : null,
                IsActive = true
            };

            await _userRepository.AddAsync(newUser);
            await _userRepository.SaveChangesAsync();

            // Re-fetch with building included
            var resultUser = await _userRepository.GetQueryable()
                .Include(u => u.Building)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.UserId == newUser.UserId);

            return _mapper.Map<UserDetailDTO>(resultUser);
        }

        public async Task<UserDetailDTO> UpdateUserAsync(int id, UpdateUserRequest request, UserRole currentRole)
        {
            var user = await _userRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (user == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Người dùng không tồn tại.", 404);
            }

            // Manager restriction
            if (currentRole == UserRole.Manager && (user.Role == UserRole.Admin || user.Role == UserRole.Manager))
            {
                throw new ParkingException("FORBIDDEN", "Bạn không có quyền sửa tài khoản này.", 403);
            }

            // Check email uniqueness if email is changed
            if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
            {
                var existingEmail = await _userRepository.GetQueryable().IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email == request.Email && u.UserId != id);
                if (existingEmail != null)
                {
                    throw new ParkingException("EMAIL_ALREADY_EXISTS", "Email đã tồn tại.", 409);
                }
            }

            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Phone = request.Phone;
            user.IsActive = request.IsActive;
            user.BuildingId = user.Role == UserRole.Staff ? request.BuildingId : null;

            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            // Re-fetch with building included
            var resultUser = await _userRepository.GetQueryable()
                .Include(u => u.Building)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.UserId == user.UserId);

            return _mapper.Map<UserDetailDTO>(resultUser);
        }

        public async Task ResetPasswordAsync(int id, string newPassword, UserRole currentRole)
        {
            var user = await _userRepository.GetQueryable().IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (user == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Người dùng không tồn tại.", 404);
            }

            // Manager can ONLY reset password of Staff
            if (currentRole == UserRole.Manager && user.Role != UserRole.Staff)
            {
                throw new ParkingException("FORBIDDEN", "Bạn chỉ có thể reset mật khẩu của tài khoản Nhân viên (Staff).", 403);
            }

            user.PasswordHash = PasswordHelper.HashPassword(newPassword);
            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();
        }

        public async Task<UserDetailDTO> UpdateProfileAsync(int userId, UpdateProfileRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Người dùng không tồn tại.", 404);
            }

            // Check email uniqueness if changed
            if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
            {
                var existingEmail = await _userRepository.GetQueryable().IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email == request.Email && u.UserId != userId);
                if (existingEmail != null)
                {
                    throw new ParkingException("EMAIL_ALREADY_EXISTS", "Email đã tồn tại.", 409);
                }
            }

            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Phone = request.Phone;

            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            return _mapper.Map<UserDetailDTO>(user);
        }

        public async Task UpdatePasswordAsync(int userId, UpdatePasswordRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new ParkingException("USER_NOT_FOUND", "Người dùng không tồn tại.", 404);
            }

            if (!PasswordHelper.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                throw new ParkingException("WRONG_PASSWORD", "Mật khẩu hiện tại không đúng.", 400);
            }

            user.PasswordHash = PasswordHelper.HashPassword(request.NewPassword);
            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();
        }
    }
}
