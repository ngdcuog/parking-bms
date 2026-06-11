using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Exceptions;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize(Roles = "Admin,Manager")]
    public class ExceptionsController : BaseApiController
    {
        private readonly IRepository<ExceptionLog> _exceptionRepository;
        private readonly IMapper _mapper;

        public ExceptionsController(IRepository<ExceptionLog> exceptionRepository, IMapper mapper)
        {
            _exceptionRepository = exceptionRepository;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResult<ExceptionLogDTO>>>> GetExceptions(
            [FromQuery] ExceptionType? exceptionType,
            [FromQuery] Guid? sessionId,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int? handledBy,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _exceptionRepository.GetQueryable()
                .Include(e => e.HandledByUser)
                .Include(e => e.Session)
                .AsQueryable();

            if (exceptionType.HasValue)
            {
                query = query.Where(e => e.ExceptionType == exceptionType.Value);
            }

            if (sessionId.HasValue)
            {
                query = query.Where(e => e.SessionId == sessionId.Value);
            }

            if (dateFrom.HasValue)
            {
                query = query.Where(e => e.CreatedAt >= dateFrom.Value);
            }

            if (dateTo.HasValue)
            {
                query = query.Where(e => e.CreatedAt <= dateTo.Value);
            }

            if (handledBy.HasValue)
            {
                query = query.Where(e => e.HandledByUserId == handledBy.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<ExceptionLogDTO>>(items);

            return Ok(ApiResponse<PagedResult<ExceptionLogDTO>>.SuccessResponse(new PagedResult<ExceptionLogDTO>(dtos, totalCount, page, pageSize)));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<ExceptionLogDTO>>> GetExceptionById(int id)
        {
            var item = await _exceptionRepository.GetQueryable()
                .Include(e => e.HandledByUser)
                .Include(e => e.Session)
                .FirstOrDefaultAsync(e => e.LogId == id);

            if (item == null)
            {
                return NotFound(ApiResponse<object>.FailResponse("EXCEPTION_LOG_NOT_FOUND", "Log ngoại lệ không tồn tại."));
            }

            var dto = _mapper.Map<ExceptionLogDTO>(item);
            return Ok(ApiResponse<ExceptionLogDTO>.SuccessResponse(dto));
        }
    }
}
