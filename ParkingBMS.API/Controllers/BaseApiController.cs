using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public abstract class BaseApiController : ControllerBase
    {
        protected int CurrentUserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        protected string CurrentUsername => User.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty;
        
        protected UserRole CurrentUserRole 
        {
            get
            {
                var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                return Enum.TryParse<UserRole>(roleClaim, out var role) ? role : UserRole.ParkingUser;
            }
        }
    }
}
