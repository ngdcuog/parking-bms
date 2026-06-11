# Parking BMS — Hệ Thống Quản Lý Bãi Đỗ Xe Thông Minh

Hệ thống quản lý bãi đỗ xe thông minh (Parking Building Management System) với kiến trúc Gateway sử dụng **YARP Reverse Proxy**, Backend monolithic **ASP.NET Core Web API**, và Frontend **React (TypeScript + Ant Design)**.

---

## 📋 Yêu Cầu Hệ Thống (Prerequisites)

Trước khi chạy dự án, hãy đảm bảo máy tính đã cài đặt các công cụ sau:
1. **.NET 8 SDK** (Dành cho Backend API & Gateway).
2. **Node.js** (Bản LTS, khuyên dùng v18 hoặc v20 - Dành cho Web Frontend).
3. **SQL Server LocalDB** (Thường đi kèm khi cài đặt Visual Studio workload *.NET Desktop* hoặc *ASP.NET*).

---

## 🚀 Hướng Dẫn Cài Đặt (Setup Guide)

### Bước 1: Clone dự án về máy
```bash
git clone https://github.com/ngdcuog/parking-bms.git
cd parking-bms
```

### Bước 2: Khởi tạo Cơ sở dữ liệu (Database Migration)
Hệ thống sử dụng EF Core để quản lý database. Chạy lệnh sau để tự động tạo Database LocalDB và các bảng liên quan:
1. Mở terminal tại thư mục `ParkingBMS.API`.
2. Chạy lệnh:
   ```bash
   dotnet ef database update
   ```
*(Khi Backend khởi động lần đầu, code Seed dữ liệu trong `DbInitializer.cs` sẽ tự động tạo sẵn các tòa nhà, tầng đỗ xe, các ô đỗ và các tài khoản thử nghiệm vào DB mới tạo).*

### Bước 3: Cài đặt Dependencies cho Frontend
1. Mở terminal tại thư mục `ParkingBMS.Web`.
2. Chạy lệnh:
   ```bash
   npm install
   ```

---

## 💻 Hướng Dẫn Chạy Dự Án (How to Run)

### 1. Khởi chạy Backend API & Gateway (YARP) cùng lúc
Khuyên dùng **Visual Studio**:
1. Mở file solution `ParkingBMS.sln` bằng Visual Studio.
2. Click chuột phải vào **Solution 'ParkingBMS'** (ở bảng Solution Explorer bên phải) -> Chọn **Properties**.
3. Tại menu **Startup Project** -> Chọn **Multiple startup projects**.
4. Cấu hình cả 2 project **`ParkingBMS.API`** và **`ParkingBMS.Gateway`** ở trạng thái Action là **`Start`**.
5. Nhấn **F5** (hoặc nút Start) để khởi chạy.
   - **Backend API** sẽ chạy tại port `5002`.
   - **Gateway (YARP)** sẽ chạy tại port `5000` (mọi request từ frontend sẽ đi qua cổng gateway này).

*Hoặc nếu chạy bằng Command Line (dotnet CLI):*
- Chạy API: `dotnet run --project ParkingBMS.API --launch-profile http` (ở port 5002)
- Chạy Gateway: `dotnet run --project ParkingBMS.Gateway` (ở port 5000)

### 2. Khởi chạy Web Frontend
1. Mở terminal tại thư mục `ParkingBMS.Web`.
2. Chạy lệnh:
   ```bash
   npm run dev
   ```
3. Truy cập trình duyệt theo địa chỉ: `http://localhost:5173`.

---

## 🔑 Tài Khoản Thử Nghiệm (Seeded Accounts)

Hệ thống đã được cấu hình sẵn các tài khoản demo tương ứng với các role nghiệp vụ chính để bạn dễ dàng chạy kiểm thử:

| Role | Username | Password | Mô tả nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` | Quản lý tài khoản người dùng, phân công tòa nhà trực cho Staff |
| **Manager** | `manager1` | `Manager@123` | Cấu hình tòa nhà, sơ đồ tầng đỗ, quản lý giá vé (Tariff) và xem báo cáo |
| **Staff** | `staff1` | `Staff@123` | Nhân viên trực bốt Tòa nhà A (đã được gán cố định bốt trực để Check-in/out) |
| **Staff** | `staff2` | `Staff@123` | Nhân viên trực bốt Tòa nhà B |
| **Driver** | `user1` | `Staff@123` | Khách gửi xe (đăng ký đặt chỗ trước qua web, nhận mã QR check-in) |
