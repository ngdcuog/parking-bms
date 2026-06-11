using System;

namespace ParkingBMS.API.Helpers
{
    public class ParkingException : Exception
    {
        public string ErrorCode { get; }
        public int StatusCode { get; }

        public ParkingException(string errorCode, string message, int statusCode = 400) 
            : base(message)
        {
            ErrorCode = errorCode;
            StatusCode = statusCode;
        }
    }
}
