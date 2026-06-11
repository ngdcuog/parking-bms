using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingBMS.API.DTOs.Common;
using ParkingBMS.API.DTOs.Payments;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Models;
using ParkingBMS.API.Repositories.Interfaces;

namespace ParkingBMS.API.Controllers
{
    [Authorize(Roles = "Admin,Manager")]
    public class PaymentsController : BaseApiController
    {
        private readonly IRepository<Payment> _paymentRepository;
        private readonly IMapper _mapper;

        public PaymentsController(IRepository<Payment> paymentRepository, IMapper mapper)
        {
            _paymentRepository = paymentRepository;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResult<PaymentDTO>>>> GetPayments(
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] PaymentMethod? paymentMethod,
            [FromQuery] Guid? sessionId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _paymentRepository.GetQueryable()
                .Include(p => p.ReceivedByStaff)
                .AsQueryable();

            if (dateFrom.HasValue)
            {
                query = query.Where(p => p.PaidAt >= dateFrom.Value);
            }

            if (dateTo.HasValue)
            {
                query = query.Where(p => p.PaidAt <= dateTo.Value);
            }

            if (paymentMethod.HasValue)
            {
                query = query.Where(p => p.PaymentMethod == paymentMethod.Value);
            }

            if (sessionId.HasValue)
            {
                query = query.Where(p => p.SessionId == sessionId.Value);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(p => p.PaidAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = _mapper.Map<List<PaymentDTO>>(items);

            return Ok(ApiResponse<PagedResult<PaymentDTO>>.SuccessResponse(new PagedResult<PaymentDTO>(dtos, totalCount, page, pageSize)));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<PaymentDTO>>> GetPaymentById(int id)
        {
            var item = await _paymentRepository.GetQueryable()
                .Include(p => p.ReceivedByStaff)
                .FirstOrDefaultAsync(p => p.PaymentId == id);

            if (item == null)
            {
                return NotFound(ApiResponse<object>.FailResponse("PAYMENT_NOT_FOUND", "Giao dịch thanh toán không tồn tại."));
            }

            var dto = _mapper.Map<PaymentDTO>(item);
            return Ok(ApiResponse<PaymentDTO>.SuccessResponse(dto));
        }
    }
}
