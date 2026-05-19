# Hướng dẫn sử dụng hệ thống quản lý Kanban

## 1. Giới thiệu

Hệ thống Kanban được thiết kế cho vận hành nội bộ công ty DUDI, hỗ trợ quản lý dự án, bảng công việc, cột trạng thái, thẻ công việc, thành viên, phòng ban/team, thông báo, lịch, báo cáo và phân quyền Admin/User.

Người dùng có thể theo dõi công việc theo dạng kéo thả, cập nhật tiến độ theo thời gian thực và nhận thông báo khi có thay đổi liên quan.

## 2. Tài khoản và đăng nhập

1. Mở ứng dụng frontend.
2. Nhập email và mật khẩu.
3. Bấm **Đăng nhập**.

Tài khoản demo mặc định:

- Email: `admin@kanban.com`
- Mật khẩu: `Admin@123`

Nếu thông tin đăng nhập sai, hệ thống sẽ hiển thị thông báo thân thiện để người dùng kiểm tra lại email hoặc mật khẩu.

## 3. Phân quyền người dùng

Hệ thống có hai nhóm quyền chính:

- **Admin hệ thống**: quản lý người dùng, tạo dự án, xem toàn bộ dự án, thêm thành viên, cập nhật thông tin dự án.
- **User**: tham gia các dự án được phân công, xem bảng, xử lý thẻ, bình luận, cập nhật công việc theo quyền trong dự án.

Về cơ cấu công ty, mỗi người dùng có thể được gắn vào một phòng ban hoặc team DUDI. Admin hệ thống quản lý cơ cấu này tại tab **Cơ cấu DUDI** để dữ liệu phòng ban không bị nhập tự do, rời rạc.

Trong từng dự án, thành viên có thể có vai trò:

- **Owner**: chủ sở hữu dự án.
- **Admin**: quản trị dự án.
- **Member**: thành viên thao tác công việc.
- **Viewer**: chỉ xem.

## 4. Dashboard tổng quan

Dashboard hiển thị:

- Số lượng dự án/bảng.
- Số lượng thành viên.
- Dự án công khai/riêng tư.
- Mẫu dự án nhanh.
- Danh sách dự án gần đây.

Admin có thể tạo dự án nhanh tại Dashboard bằng cách nhập mã dự án, tên dự án, mô tả, đơn vị phụ trách và tùy chọn công khai.

## 5. Tab Dự án

Tab **Dự án** dùng để tổng hợp danh sách dự án riêng, giúp Dashboard gọn hơn.

Tại đây có thể:

- Tìm dự án theo mã, tên hoặc tóm tắt.
- Lọc dự án công khai/riêng tư.
- Mở nhanh bảng Kanban của dự án.
- Xem số tài liệu, thành viên và thông tin tóm tắt.

## 6. Quản lý dự án

Trong màn hình chi tiết bảng, bấm **Tổng quan dự án** để mở phần thông tin dự án.

Admin hoặc người có quyền quản trị dự án có thể cập nhật:

- Mã dự án.
- Tên dự án.
- Mô tả ngắn.
- Tóm tắt dự án.
- Đơn vị phụ trách, ví dụ phòng ban hoặc team DUDI.
- Trạng thái công khai/riêng tư.
- Tài liệu dự án.

Tài liệu dự án có thể là link đặc tả, báo cáo, thiết kế, biên bản họp hoặc tài liệu tham khảo.

## 7. Bảng Kanban

Mỗi dự án có một bảng Kanban gồm nhiều cột trạng thái.

Các thao tác chính:

- Thêm cột mới.
- Đổi tên cột.
- Xóa cột.
- Kéo cột để thay đổi thứ tự.
- Kéo thẻ giữa các cột để cập nhật trạng thái.
- Bấm **Thu gọn** để giảm chi tiết hiển thị trên bảng.

Khi kéo thẻ sang cột khác, thẻ sẽ được đặt lên đầu cột đích để dễ theo dõi thay đổi mới nhất.

## 8. Thẻ công việc

Trong mỗi cột, bấm nút **+** trên đầu cột để thêm thẻ mới.

Trong chi tiết thẻ có thể cập nhật:

- Tiêu đề.
- Mô tả.
- Người phụ trách.
- Độ ưu tiên.
- Hạn hoàn thành.
- Nhãn.
- Checklist.
- Tệp đính kèm.
- Bình luận.

Các trường bắt buộc được đánh dấu màu đỏ để người dùng dễ nhận biết.

Một số thao tác có thể dùng phím **Enter** để lưu nhanh, ví dụ thêm nhãn, thêm checklist hoặc thêm thẻ.

## 9. Thành viên dự án

Trong màn hình bảng, bấm **Thành viên** để mở danh sách thành viên.

Người quản trị có thể:

- Thêm thành viên bằng email.
- Thêm cả phòng ban/team vào dự án.
- Gán vai trò cho thành viên.
- Thay đổi vai trò.
- Xóa thành viên khỏi dự án.

Khi thêm cả phòng ban/team, hệ thống tự lấy thành viên trong đơn vị đó. Trưởng nhóm hoặc quản lý đơn vị có thể được đưa vào dự án với quyền quản trị dự án, còn thành viên thường được thêm theo vai trò đã chọn.

Khi một người dùng được thêm vào dự án, hệ thống sẽ tạo thông báo cho người đó.

## 10. Thông báo

Biểu tượng chuông trên topbar hiển thị thông báo mới.

Thông báo hỗ trợ:

- Đánh dấu đã đọc.
- Tự làm mới định kỳ.
- Bấm vào thông báo để đi tới đúng dự án hoặc thẻ liên quan.

Khi thẻ được kéo/sắp xếp trong dự án, các thành viên khác trong dự án sẽ nhận được thông báo.

## 11. Lịch

Tab **Lịch** hiển thị các thẻ có hạn hoàn thành theo tháng.

Người dùng có thể:

- Xem công việc theo ngày.
- Lọc theo ưu tiên.
- Lọc theo bảng/dự án.
- Mở nhanh thẻ hoặc bảng liên quan.

## 12. Việc của tôi

Tab **Việc của tôi** tổng hợp các thẻ liên quan đến người dùng hiện tại.

Các nhóm thường dùng:

- Công việc hôm nay.
- Công việc quá hạn.
- Công việc ưu tiên cao.
- Công việc chưa có hạn.

## 13. Hoạt động

Tab **Hoạt động** ghi nhận các thay đổi trên bảng theo thời gian thực.

Ví dụ:

- Tạo thẻ.
- Cập nhật thẻ.
- Di chuyển thẻ.
- Thay đổi thứ tự cột.
- Thêm thành viên.

## 14. Báo cáo

Tab **Báo cáo** giúp theo dõi hiệu suất dự án:

- Tổng số bảng.
- Tổng số thẻ.
- Tỷ lệ hoàn thành.
- Thành viên.
- Bảng có nhiều công việc.
- Bảng có rủi ro cao.

Các báo cáo giúp người quản trị phát hiện dự án quá tải, nhiều thẻ quá hạn hoặc tiến độ thấp.

## 15. Hồ sơ cá nhân

Tab **Hồ sơ** cho phép người dùng cập nhật:

- Họ tên.
- Ảnh đại diện.
- Phòng ban.
- Chức danh.
- Mật khẩu.

Cập nhật ảnh đại diện:

1. Vào **Hồ sơ**.
2. Bấm biểu tượng máy ảnh trên avatar.
3. Chọn ảnh JPG, PNG, WEBP hoặc GIF.
4. Ảnh tối đa 2 MB.
5. Hệ thống tự lưu và cập nhật avatar.

Ngoài upload ảnh, người dùng vẫn có thể nhập link ảnh trực tiếp vào ô **Link ảnh đại diện** rồi bấm **Lưu hồ sơ**.

## 16. Giao diện sáng/tối

Người dùng có thể đổi giao diện bằng nút mặt trời/mặt trăng trên topbar.

- Giao diện sáng phù hợp khi làm việc ban ngày.
- Giao diện tối phù hợp khi làm việc lâu hoặc trong môi trường thiếu sáng.

## 17. Quản trị người dùng

Chỉ Admin hệ thống mới thấy tab **Quản trị Admin** và **Cơ cấu DUDI**.

Admin có thể:

- Xem danh sách người dùng.
- Tạo tài khoản mới.
- Cập nhật thông tin người dùng.
- Bật/tắt trạng thái hoạt động.
- Gán quyền quản trị hệ thống.
- Đặt lại mật khẩu.

## 18. Cơ cấu DUDI

Tab **Cơ cấu DUDI** dùng để quản lý phòng ban và team thực tế của công ty.

Admin có thể:

- Tạo phòng ban, ví dụ `Ban vận hành DUDI`, `Phòng sản phẩm & kỹ thuật`.
- Tạo team thuộc phòng ban, ví dụ `Team Frontend`, `Team Backend`, `Team QA`.
- Gán quản lý hoặc trưởng nhóm.
- Thêm thành viên vào từng phòng ban/team.
- Đổi vai trò thành viên trong đơn vị: **Thành viên** hoặc **Trưởng nhóm**.
- Theo dõi đơn vị đó đang có bao nhiêu thành viên và đang phụ trách bao nhiêu dự án.

Luồng khuyến nghị cho DUDI:

1. Admin tạo/cập nhật cơ cấu tại **Cơ cấu DUDI**.
2. Admin vào **Quản trị Admin** để gán mỗi tài khoản vào đúng phòng ban/team.
3. Khi tạo hoặc cập nhật dự án, chọn **Đơn vị phụ trách**.
4. Trong màn hình dự án, bấm **Thành viên** và chọn **Thêm cả phòng ban/team** để đưa nguyên nhóm vào dự án.
5. Sau khi thêm, từng người sẽ nhận thông báo và thấy dự án trong không gian làm việc của mình.

## 19. Gợi ý sử dụng hiệu quả

- Tạo mã dự án rõ ràng, ví dụ `PRJ-001`, `BCTT-2026`.
- Gắn dự án với đúng phòng ban/team phụ trách để báo cáo và phân quyền rõ hơn.
- Thêm cả team vào dự án khi dự án thuộc một nhóm cố định, tránh phải nhập từng email.
- Tạo các cột cơ bản như `Backlog`, `Todo`, `In Progress`, `Done`.
- Dùng nhãn để phân loại frontend, backend, bug, report.
- Gán người phụ trách và hạn hoàn thành cho thẻ quan trọng.
- Thường xuyên xem tab **Báo cáo** để phát hiện rủi ro.
- Dùng tab **Dự án** để quản lý danh sách dự án thay vì dồn hết vào Dashboard.

## 20. Lỗi thường gặp

### Không đăng nhập được

Kiểm tra lại email, mật khẩu hoặc trạng thái tài khoản. Nếu tài khoản bị khóa, liên hệ Admin hệ thống.

### Không thấy dự án

Người dùng chỉ thấy dự án mà mình là thành viên, trừ Admin hệ thống.

Nếu đã gắn người dùng vào team nhưng vẫn chưa thấy dự án, hãy kiểm tra dự án đã được thêm cả team hoặc thêm riêng người dùng vào danh sách thành viên chưa.

### Không upload được avatar

Kiểm tra:

- File có đúng định dạng ảnh không.
- File có vượt quá 2 MB không.
- Backend API có đang chạy không.

### Không nhận thông báo

Kiểm tra:

- Người dùng có phải thành viên dự án không.
- Backend API và SignalR có đang chạy không.
- Thử mở lại menu chuông hoặc chờ hệ thống tự làm mới.

## 21. Thông tin chạy hệ thống

Backend mặc định:

```bash
cd KanbanProject/BE/Kanban.API
dotnet run
```

Frontend mặc định:

```bash
cd KanbanProject/FE/kanban-client
npm install
npm run dev
```

Đường dẫn thường dùng:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/health`
