using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Models;

namespace ParkingBMS.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<AppUser> AppUsers { get; set; } = null!;
        public DbSet<ParkingBuilding> ParkingBuildings { get; set; } = null!;
        public DbSet<ParkingFloor> ParkingFloors { get; set; } = null!;
        public DbSet<ParkingSlot> ParkingSlots { get; set; } = null!;
        public DbSet<ParkingSession> ParkingSessions { get; set; } = null!;
        public DbSet<Booking> Bookings { get; set; } = null!;
        public DbSet<TariffConfig> TariffConfigs { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<ExceptionLog> ExceptionLogs { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Timezone converters for DateTime (Appendix E)
            var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc)
            );

            var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
                v => !v.HasValue ? v : (v.Value.Kind == DateTimeKind.Utc ? v : v.Value.ToUniversalTime()),
                v => !v.HasValue ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)
            );

            // Apply DateTime converters & Enum converters globally
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    // DateTime UTC conversion
                    if (property.ClrType == typeof(DateTime))
                    {
                        property.SetValueConverter(dateTimeConverter);
                    }
                    else if (property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(nullableDateTimeConverter);
                    }

                    // Enum to TINYINT (byte) conversion
                    if (property.ClrType.IsEnum)
                    {
                        var underlyingType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
                        if (underlyingType == typeof(UserRole) ||
                            underlyingType == typeof(VehicleType) ||
                            underlyingType == typeof(SlotStatus) ||
                            underlyingType == typeof(SessionStatus) ||
                            underlyingType == typeof(SessionType) ||
                            underlyingType == typeof(BookingStatus) ||
                            underlyingType == typeof(PaymentMethod) ||
                            underlyingType == typeof(ExceptionType))
                        {
                            property.SetProviderClrType(typeof(byte));
                        }
                    }
                }
            }

            // --- AppUser Entity ---
            modelBuilder.Entity<AppUser>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.PasswordHash).HasMaxLength(256).IsRequired();
                entity.Property(e => e.FullName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(150);
                entity.Property(e => e.Phone).HasMaxLength(15);
                entity.Property(e => e.RefreshTokenHash).HasMaxLength(256);
                entity.Property(e => e.Role).HasConversion<byte>();

                // Indexes
                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email)
                    .IsUnique()
                    .HasFilter("[Email] IS NOT NULL");

                // Global Filter
                entity.HasQueryFilter(e => e.IsActive);

                // Relationship: AppUser -> ParkingBuilding (For Staff)
                entity.HasOne(d => d.Building)
                    .WithMany()
                    .HasForeignKey(d => d.BuildingId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // --- ParkingBuilding Entity ---
            modelBuilder.Entity<ParkingBuilding>(entity =>
            {
                entity.HasKey(e => e.BuildingId);
                entity.Property(e => e.BuildingName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.ContactPhone).HasMaxLength(15);

                // Global Filter
                entity.HasQueryFilter(e => e.IsActive);
            });

            // --- ParkingFloor Entity ---
            modelBuilder.Entity<ParkingFloor>(entity =>
            {
                entity.HasKey(e => e.FloorId);
                entity.Property(e => e.FloorName).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(200);
                entity.Property(e => e.VehicleType).HasConversion<byte>();

                // Relationships
                entity.HasOne(d => d.Building)
                    .WithMany(p => p.Floors)
                    .HasForeignKey(d => d.BuildingId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Global Filter
                entity.HasQueryFilter(e => e.IsActive);
            });

            // --- ParkingSlot Entity ---
            modelBuilder.Entity<ParkingSlot>(entity =>
            {
                entity.HasKey(e => e.SlotId);
                entity.Property(e => e.SlotCode).HasMaxLength(10).IsRequired();
                entity.Property(e => e.VehicleType).HasConversion<byte>();
                entity.Property(e => e.Status).HasConversion<byte>();
                entity.Property(e => e.RowVersion).IsRowVersion();

                // Relationships
                entity.HasOne(d => d.Floor)
                    .WithMany(p => p.Slots)
                    .HasForeignKey(d => d.FloorId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Indexes
                entity.HasIndex(e => new { e.FloorId, e.SlotCode }).IsUnique();
                entity.HasIndex(e => new { e.Status, e.VehicleType });

                // Global Filter
                entity.HasQueryFilter(e => e.IsActive);
            });

            // --- ParkingSession Entity ---
            modelBuilder.Entity<ParkingSession>(entity =>
            {
                entity.HasKey(e => e.SessionId);
                entity.Property(e => e.LicensePlate).HasMaxLength(20).IsRequired();
                entity.Property(e => e.QRCode).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Note).HasMaxLength(500);
                entity.Property(e => e.Fee).HasColumnType("decimal(12,0)");
                entity.Property(e => e.VehicleType).HasConversion<byte>();
                entity.Property(e => e.SessionType).HasConversion<byte>();
                entity.Property(e => e.Status).HasConversion<byte>();

                // Relationships
                entity.HasOne(d => d.Slot)
                    .WithMany(p => p.Sessions)
                    .HasForeignKey(d => d.SlotId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.User)
                    .WithMany(p => p.UserSessions)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.Booking)
                    .WithMany(p => p.Sessions)
                    .HasForeignKey(d => d.BookingId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.CheckInStaff)
                    .WithMany(p => p.CheckedInSessionsByStaff)
                    .HasForeignKey(d => d.CheckInByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.CheckOutStaff)
                    .WithMany(p => p.CheckedOutSessionsByStaff)
                    .HasForeignKey(d => d.CheckOutByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Indexes
                entity.HasIndex(e => new { e.LicensePlate, e.Status });
                entity.HasIndex(e => e.CheckInTime);
                entity.HasIndex(e => new { e.Status, e.SlotId });
            });

            // --- Booking Entity ---
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(e => e.BookingId);
                entity.Property(e => e.LicensePlate).HasMaxLength(20);
                entity.Property(e => e.QRCode).HasMaxLength(100).IsRequired();
                entity.Property(e => e.VehicleType).HasConversion<byte>();
                entity.Property(e => e.Status).HasConversion<byte>();

                // Relationships
                entity.HasOne(d => d.User)
                    .WithMany(p => p.Bookings)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Slot)
                    .WithMany(p => p.Bookings)
                    .HasForeignKey(d => d.SlotId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Indexes
                entity.HasIndex(e => new { e.UserId, e.Status });
                entity.HasIndex(e => new { e.SlotId, e.PlannedCheckIn, e.PlannedCheckOut });
            });

            // --- TariffConfig Entity ---
            modelBuilder.Entity<TariffConfig>(entity =>
            {
                entity.HasKey(e => e.TariffId);
                entity.Property(e => e.PricePerHour).HasColumnType("decimal(10,0)");
                entity.Property(e => e.PeakHourRate).HasColumnType("decimal(5,2)");
                entity.Property(e => e.DailyMaxFee).HasColumnType("decimal(10,0)");
                entity.Property(e => e.LostTicketFee).HasColumnType("decimal(10,0)");
                entity.Property(e => e.OvertimeFeeRate).HasColumnType("decimal(5,2)");
                entity.Property(e => e.VehicleType).HasConversion<byte>();

                // Global Filter
                entity.HasQueryFilter(e => e.IsActive);
            });

            // --- Payment Entity ---
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.PaymentId);
                entity.Property(e => e.Amount).HasColumnType("decimal(12,0)");
                entity.Property(e => e.BaseFee).HasColumnType("decimal(12,0)");
                entity.Property(e => e.PenaltyFee).HasColumnType("decimal(12,0)");
                entity.Property(e => e.PaymentMethod).HasConversion<byte>();

                // Relationships
                entity.HasOne(d => d.Session)
                    .WithOne(p => p.Payment)
                    .HasForeignKey<Payment>(d => d.SessionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.ReceivedByStaff)
                    .WithMany(p => p.PaymentsReceived)
                    .HasForeignKey(d => d.ReceivedByStaffId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // --- ExceptionLog Entity ---
            modelBuilder.Entity<ExceptionLog>(entity =>
            {
                entity.HasKey(e => e.LogId);
                entity.Property(e => e.OriginalValue).HasMaxLength(200);
                entity.Property(e => e.NewValue).HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.AdditionalFee).HasColumnType("decimal(10,0)");
                entity.Property(e => e.ExceptionType).HasConversion<byte>();

                // Relationships
                entity.HasOne(d => d.Session)
                    .WithMany(p => p.ExceptionLogs)
                    .HasForeignKey(d => d.SessionId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.HandledByUser)
                    .WithMany(p => p.ExceptionLogsHandled)
                    .HasForeignKey(d => d.HandledByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
