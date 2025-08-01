# Trang Thống Kê Đăng Ký Người Dùng

## Tổng quan
Trang thống kê đăng ký người dùng là một tính năng mới trong hệ thống LMS, cho phép admin xem và theo dõi số lượng người đăng ký mới theo các khoảng thời gian khác nhau dựa trên **dữ liệu thực** từ hệ thống.

## Tính năng chính

### 1. Thống kê tổng quan (Dữ liệu thực)
- **Đăng ký hôm nay**: Số người đăng ký trong ngày hiện tại
- **Đăng ký tuần này**: Số người đăng ký trong tuần hiện tại  
- **Đăng ký tháng này**: Số người đăng ký trong tháng hiện tại
- **Đăng ký năm này**: Số người đăng ký trong năm hiện tại
- **Tổng số người dùng**: Tổng số người dùng trong hệ thống

### 2. Biểu đồ thống kê (Dữ liệu thực)
- **Biểu đồ đăng ký hàng ngày**: Số lượng đăng ký thực tế theo từng ngày trong tháng
- **Biểu đồ đăng ký hàng tháng**: Số lượng đăng ký thực tế theo từng tháng trong năm

### 3. Danh sách người dùng gần đây
- Hiển thị 10 người dùng đăng ký gần đây nhất (sắp xếp theo ngày đăng ký thực)
- Thông tin bao gồm: tên đăng nhập, họ tên, email, vai trò, **ngày đăng ký**, trạng thái xác thực

### 4. Danh sách tất cả người dùng với phân trang
- **Hiển thị đầy đủ**: Tất cả người dùng trong hệ thống với thông tin chi tiết
- **Phân trang thông minh**: Chia nhỏ dữ liệu với các tùy chọn 5, 10, 25, 50 mục/trang
- **Tìm kiếm nâng cao**: Tìm theo tên đăng nhập, email, họ tên
- **Bộ lọc đa tiêu chí**: Lọc theo vai trò (Admin, Instructor, Student) và trạng thái xác thực
- **Thống kê real-time**: Hiển thị số lượng kết quả tìm kiếm và vị trí hiện tại

### 5. Thông báo chất lượng dữ liệu
- Hiển thị cảnh báo nếu thiếu thông tin ngày đăng ký
- Thống kê số lượng người dùng không có dữ liệu ngày tháng
- Hướng dẫn về độ chính xác của thống kê

### 6. Xuất dữ liệu
- **Xuất JSON**: Xuất dữ liệu thống kê thực dưới dạng file JSON
- **Xuất PDF**: Xuất báo cáo thống kê đầy đủ dưới dạng file PDF

## Nguồn dữ liệu

### API Endpoints được sử dụng:
1. **GET /api/users/list** - Lấy danh sách tất cả người dùng
2. **GET /api/users/statistics/registrations** - Lấy thống kê từ backend (fallback nếu không có)
3. **GET /api/users/list/date-range** - Lấy người dùng theo khoảng thời gian

### Xử lý dữ liệu ngày tháng:
- **Ưu tiên 1**: `user.createdAt` (thời gian tạo tài khoản)
- **Ưu tiên 2**: `user.registrationDate` (ngày đăng ký)
- **Fallback**: Sắp xếp theo `userId` (giả định ID cao hơn = mới hơn)

## Cách sử dụng

### Truy cập trang thống kê
1. Đăng nhập với tài khoản admin
2. Trong sidebar admin, click vào "Thống kê đăng ký"
3. Hoặc truy cập trực tiếp URL: `/registration-statistics`

### Quản lý danh sách người dùng
1. **Tìm kiếm**: Sử dụng ô tìm kiếm để tìm theo tên đăng nhập, email hoặc họ tên
2. **Lọc theo vai trò**: Chọn Admin, Instructor, Student hoặc "Tất cả vai trò"
3. **Lọc theo trạng thái**: Chọn "Đã xác thực", "Chưa xác thực" hoặc "Tất cả trạng thái"
4. **Phân trang**: Sử dụng các nút điều hướng hoặc chọn số mục hiển thị trên mỗi trang
5. **Xóa bộ lọc**: Click "Xóa bộ lọc" để reset tất cả tiêu chí tìm kiếm

### Đọc hiểu thống kê
- **Các số liệu có màu xanh**: Dữ liệu chính xác dựa trên ngày đăng ký thực
- **Thông báo vàng**: Cảnh báo về chất lượng dữ liệu (nếu có)
- **Biểu đồ**: Phản ánh số liệu thực tế từ database

### Xuất báo cáo PDF
1. Trên trang thống kê, click nút "Xuất PDF"
2. Hệ thống sẽ tạo file PDF bao gồm:
   - Trang bìa với thông tin báo cáo
   - Thống kê tổng quan thực tế
   - Biểu đồ và phân tích chi tiết
   - Cảnh báo về chất lượng dữ liệu (nếu có)
   - Thông tin người xuất và thời gian

### Làm mới dữ liệu
- Click nút "Làm mới" để cập nhật dữ liệu thống kê mới nhất từ database

## Chất lượng dữ liệu

### Trường hợp lý tưởng:
- Tất cả người dùng có `createdAt` hoặc `registrationDate`
- Thống kê hoàn toàn chính xác theo thời gian thực

### Trường hợp cần lưu ý:
- **Thiếu ngày tháng**: Một số người dùng không có thông tin ngày đăng ký
- **Dữ liệu không đầy đủ**: Thống kê theo thời gian có thể không phản ánh toàn bộ

### Hệ thống xử lý:
- Tự động phát hiện và báo cáo các vấn đề về dữ liệu
- Cung cấp thông tin về số lượng bản ghi có/không có ngày tháng
- Vẫn hiển thị thống kê tối đa có thể với dữ liệu hiện có

## Kỹ thuật

### Cải tiến so với phiên bản trước:
- ✅ **Dữ liệu thực**: Không còn sử dụng số ngẫu nhiên
- ✅ **Xử lý ngày tháng**: Hỗ trợ nhiều format và field
- ✅ **Kiểm tra chất lượng**: Thông báo về tình trạng dữ liệu
- ✅ **Sắp xếp thông minh**: Ưu tiên ngày tháng, fallback theo ID
- ✅ **API mở rộng**: Chuẩn bị cho thống kê từ backend
- ✅ **Phân trang**: Hiển thị tất cả người dùng với phân trang thông minh
- ✅ **Tìm kiếm & lọc**: Bộ lọc đa tiêu chí và tìm kiếm real-time
- ✅ **UX cải thiện**: Giao diện responsive, thông tin chi tiết

### User Interface được mở rộng:
```typescript
interface User {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  verified: boolean;
  createdAt?: string;        // ✅ Mới thêm
  registrationDate?: string; // ✅ Mới thêm
  cvUrl?: string | null;
  avatarUrl?: string | null;
}
```

### Methods mới được thêm:
- `getUserRegistrationStatistics()`: Lấy thống kê từ API
- `getUsersByDateRange()`: Lấy user theo khoảng thời gian
- `getUserRegistrationDate()`: Parse ngày đăng ký
- `getFormattedDate()`: Format ngày tháng hiển thị
- `setupAllUsers()`: Khởi tạo dữ liệu cho phân trang
- `applyFilters()`: Áp dụng bộ lọc và tìm kiếm
- `goToPage()`, `nextPage()`, `previousPage()`: Điều hướng phân trang
- `changeItemsPerPage()`: Thay đổi số mục trên mỗi trang
- `clearFilters()`: Xóa tất cả bộ lọc

### Tính năng phân trang:
```typescript
// Pagination properties
currentPage = 1;
itemsPerPage = 10;
totalPages = 0;
totalUsers = 0;

// Filter properties  
searchTerm = '';
selectedRole = '';
selectedStatus = '';
```

## Lưu ý
- Tính năng này chỉ dành cho admin
- **Dữ liệu thống kê là thực tế** từ database
- Hệ thống tự động xử lý trường hợp thiếu dữ liệu ngày tháng
- Thông báo rõ ràng về chất lượng và độ tin cậy của thống kê
