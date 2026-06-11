using System.Text.RegularExpressions;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.Helpers
{
    public static class LicensePlateValidator
    {
        // Xe máy CŨ (TT 58/2020): [2 số][1 chữ B-Z trừ I][1 số 1-9]-[4 hoặc 5 số]
        // VD: 51H1-1234, 29K2-12345
        private static readonly Regex MotoOld4 = new(@"^\d{2}[BCDEFGHKLMNPSTUVXYZ][1-9]-\d{4}$", RegexOptions.Compiled);
        private static readonly Regex MotoOld5 = new(@"^\d{2}[BCDEFGHKLMNPSTUVXYZ][1-9]-\d{5}$", RegexOptions.Compiled);

        // Xe máy MỚI định danh (TT 24/2023): [2 số][2 chữ A-Z trừ IOQRW]-[3 số].[2 số]
        // VD: 51AB-123.45, 29HA-002.33
        private static readonly Regex MotoNew  = new(@"^\d{2}[ABCDEFGHKLMNPSTUVXYZ]{2}-\d{3}\.\d{2}$", RegexOptions.Compiled);

        // Ô tô: [2 số][1 chữ]-[4 hoặc 5 số], có thể có dấu chấm
        // VD: 51A-12345, 30G-6789, 43H-123.45
        private static readonly Regex CarPlate = new(@"^\d{2}[A-Z]-\d{4,5}(\.\d{2})?$", RegexOptions.Compiled);

        // Xe tải: [2 số][1-2 chữ]-[4-5 số]
        // VD: 51D-12345, 51LD-1234
        private static readonly Regex TruckPlate = new(@"^\d{2}[A-Z]{1,2}-\d{4,5}(\.\d{2})?$", RegexOptions.Compiled);

        public static bool IsValid(string plate, VehicleType vehicleType)
        {
            if (string.IsNullOrWhiteSpace(plate)) return false;
            var p = plate.Trim().ToUpper();

            return vehicleType switch
            {
                VehicleType.Motorbike => MotoOld4.IsMatch(p) || MotoOld5.IsMatch(p) || MotoNew.IsMatch(p),
                VehicleType.Car       => CarPlate.IsMatch(p),
                VehicleType.Truck     => TruckPlate.IsMatch(p),
                _ => false
            };
        }
    }
}
