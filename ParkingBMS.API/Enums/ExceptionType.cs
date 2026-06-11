namespace ParkingBMS.API.Enums
{
    public enum ExceptionType : byte
    {
        LostTicket = 0,
        WrongPlate = 1,
        Overstay = 2,
        WrongZone = 3,
        Other = 4
    }
}
