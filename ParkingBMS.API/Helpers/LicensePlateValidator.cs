using System.Text.RegularExpressions;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Helpers
{
    public static class LicensePlateValidator
    {
        // Xe máy CŨ (TT 58/2020): [2 số][1 chữ B-Z trừ I][1 số 1-9]-[4 hoặc 5 số]
        // Hỗ trợ cả định dạng viết liền không dấu, có hoặc không có dấu chấm ở biển 5 số (VD: 12345 hoặc 123.45).
        // VD: 51H1-1234, 51H11234, 29K2-123.45, 29K212345
        private static readonly Regex MotoOld4 = new(@"^\d{2}[BCDEFGHKLMNPSTUVXYZ][1-9]-?\d{4}$", RegexOptions.Compiled);
        private static readonly Regex MotoOld5 = new(@"^\d{2}[BCDEFGHKLMNPSTUVXYZ][1-9]-?(\d{5}|\d{3}\.?\d{2})$", RegexOptions.Compiled);

        // Xe máy MỚI định danh (TT 24/2023): [2 số][2 chữ A-Z trừ IOQRW]-[3 số].[2 số]
        // VD: 51AB-123.45, 51AB12345, 29HA-002.33, 29HA00233
        private static readonly Regex MotoNew  = new(@"^\d{2}[ABCDEFGHKLMNPSTUVXYZ]{2}-?(\d{5}|\d{3}\.?\d{2})$", RegexOptions.Compiled);

        // Ô tô: [2 số tỉnh][1 chữ cái]- [4 số hoặc 5 số (xxx.xx hoặc xxxxx)]
        // VD: 51A-1234, 51A-123.45, 51A12345, 30G-6789, 43H-123.45
        private static readonly Regex CarPlate = new(@"^\d{2}[A-Z]-?(\d{4}|\d{5}|\d{3}\.?\d{2})$", RegexOptions.Compiled);

        // Xe tải: [2 số tỉnh][1-2 chữ cái]- [4 số hoặc 5 số (xxx.xx hoặc xxxxx)]
        // VD: 51D-12345, 51D12345, 51LD-123.45, 51LD1234
        private static readonly Regex TruckPlate = new(@"^\d{2}[A-Z]{1,2}-?(\d{4}|\d{5}|\d{3}\.?\d{2})$", RegexOptions.Compiled);

        // Fallback cho Biển số đặc biệt (Xe quân sự, Ngoại giao, Xe công an, hoặc nhập tay đặc cách)
        // Nghiệp vụ thực tế: Nhân viên (Staff) không được phép bị chặn khi xe đặc biệt vào bãi.
        // VD: TM-1234 (Quân sự), 80-NG-123.45 (Ngoại giao), v.v.
        // Chấp nhận mọi chuỗi ký tự chữ, số, dấu gạch ngang, dấu chấm, khoảng trắng dài từ 4 đến 15 ký tự.
        private static readonly Regex SpecialPlate = new(@"^[A-Z0-9.\-\s]{4,15}$", RegexOptions.Compiled);

        public static bool IsValid(string plate, VehicleType vehicleType)
        {
            if (string.IsNullOrWhiteSpace(plate)) return false;
            var p = plate.Trim().ToUpper();

            // 1. Kiểm tra theo định dạng chuẩn (cho phép không nhập dấu gạch/chấm)
            bool isStandardFormat = vehicleType switch
            {
                VehicleType.Motorbike => MotoOld4.IsMatch(p) || MotoOld5.IsMatch(p) || MotoNew.IsMatch(p),
                VehicleType.Car       => CarPlate.IsMatch(p),
                VehicleType.Truck     => TruckPlate.IsMatch(p),
                _ => false
            };

            if (isStandardFormat) return true;

            // 2. Nếu không khớp định dạng chuẩn, cho phép đi qua nếu là biển đặc biệt (quân sự, ngoại giao...)
            // Điều này đảm bảo nhân viên bảo vệ (Staff) tại cổng luôn check-in được cho mọi loại xe thực tế.
            return SpecialPlate.IsMatch(p);
        }
    }
}
