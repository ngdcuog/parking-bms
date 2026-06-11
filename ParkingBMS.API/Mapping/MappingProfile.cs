using AutoMapper;
using ParkingBMS.API.DTOs.Auth;
using ParkingBMS.API.DTOs.Buildings;
using ParkingBMS.API.DTOs.Floors;
using ParkingBMS.API.DTOs.Slots;
using ParkingBMS.API.DTOs.Sessions;
using ParkingBMS.API.DTOs.Bookings;
using ParkingBMS.API.DTOs.Tariffs;
using ParkingBMS.API.DTOs.Payments;
using ParkingBMS.API.DTOs.Exceptions;
using ParkingBMS.API.DTOs.Users;
using ParkingBMS.API.Models;

namespace ParkingBMS.API.Mapping
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // AppUser
            CreateMap<AppUser, UserDTO>();
            CreateMap<AppUser, UserSummaryDTO>()
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Building != null ? src.Building.BuildingName : null));
            CreateMap<AppUser, UserDetailDTO>()
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Building != null ? src.Building.BuildingName : null));
            CreateMap<AppUser, LoginResponse>()
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Building != null ? src.Building.BuildingName : null));

            // Building
            CreateMap<ParkingBuilding, BuildingDTO>();
            CreateMap<ParkingBuilding, BuildingDetailDTO>()
                .ForMember(dest => dest.Floors, opt => opt.MapFrom(src => src.Floors));
            CreateMap<ParkingBuilding, BuildingPublicInfoDTO>();
            CreateMap<ParkingFloor, FloorSummaryDTO>();

            // Floor
            CreateMap<ParkingFloor, FloorDTO>();

            // Slot
            CreateMap<ParkingSlot, SlotDTO>();
            CreateMap<ParkingSlot, SlotGridDTO>();
            CreateMap<ParkingSlot, SlotDetailDTO>();

            // Session
            CreateMap<ParkingSession, SessionSummaryDTO>()
                .ForMember(dest => dest.SlotCode, opt => opt.MapFrom(src => src.Slot.SlotCode))
                .ForMember(dest => dest.FloorName, opt => opt.MapFrom(src => src.Slot.Floor.FloorName))
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Slot.Floor.Building.BuildingName));

            CreateMap<ParkingSession, SessionDetailDTO>()
                .IncludeBase<ParkingSession, SessionSummaryDTO>()
                .ForMember(dest => dest.CheckInByStaffName, opt => opt.MapFrom(src => src.CheckInStaff.FullName))
                .ForMember(dest => dest.CheckOutByStaffName, opt => opt.MapFrom(src => src.CheckOutStaff != null ? src.CheckOutStaff.FullName : null))
                .ForMember(dest => dest.Payment, opt => opt.MapFrom(src => src.Payment))
                .ForMember(dest => dest.ExceptionLogs, opt => opt.MapFrom(src => src.ExceptionLogs));

            CreateMap<ParkingSession, CheckInResponseDTO>()
                .ForMember(dest => dest.SlotCode, opt => opt.MapFrom(src => src.Slot.SlotCode))
                .ForMember(dest => dest.FloorName, opt => opt.MapFrom(src => src.Slot.Floor.FloorName))
                .ForMember(dest => dest.FloorNumber, opt => opt.MapFrom(src => src.Slot.Floor.FloorNumber))
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Slot.Floor.Building.BuildingName));

            CreateMap<ParkingSession, CheckOutResponseDTO>()
                .ForMember(dest => dest.SlotCode, opt => opt.MapFrom(src => src.Slot.SlotCode))
                .ForMember(dest => dest.FloorName, opt => opt.MapFrom(src => src.Slot.Floor.FloorName))
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Slot.Floor.Building.BuildingName));

            CreateMap<ParkingSession, ActiveSessionSummaryDTO>()
                .ForMember(dest => dest.SlotCode, opt => opt.MapFrom(src => src.Slot.SlotCode))
                .ForMember(dest => dest.FloorName, opt => opt.MapFrom(src => src.Slot.Floor.FloorName))
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Slot.Floor.Building.BuildingName));

            // Booking
            CreateMap<Booking, BookingDTO>()
                .ForMember(dest => dest.UserFullName, opt => opt.MapFrom(src => src.User.FullName))
                .ForMember(dest => dest.SlotCode, opt => opt.MapFrom(src => src.Slot.SlotCode))
                .ForMember(dest => dest.FloorName, opt => opt.MapFrom(src => src.Slot.Floor.FloorName))
                .ForMember(dest => dest.BuildingId, opt => opt.MapFrom(src => src.Slot.Floor.BuildingId))
                .ForMember(dest => dest.BuildingName, opt => opt.MapFrom(src => src.Slot.Floor.Building.BuildingName));

            // Tariff
            CreateMap<TariffConfig, TariffDTO>();

            // Payment
            CreateMap<Payment, PaymentDTO>()
                .ForMember(dest => dest.ReceivedByStaffName, opt => opt.MapFrom(src => src.ReceivedByStaff.FullName));

            // ExceptionLog
            CreateMap<ExceptionLog, ExceptionLogDTO>()
                .ForMember(dest => dest.HandledByName, opt => opt.MapFrom(src => src.HandledByUser.FullName));
        }
    }

    // Dummy class just to reference in Automapper if needed
    public class UserDTO { }
}
