namespace ParkingBMS.API.DTOs.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Message { get; set; } = "OK";
        public string? ErrorCode { get; set; }

        public static ApiResponse<T> SuccessResponse(T data, string message = "OK")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Data = data,
                Message = message
            };
        }

        public static ApiResponse<T> FailResponse(string errorCode, string message)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Data = default,
                Message = message,
                ErrorCode = errorCode
            };
        }
    }
}
