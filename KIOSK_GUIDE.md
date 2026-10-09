# Hướng Dẫn Thiết Lập Kiosk Mode (Samsung Tablet) - PeopleDetector

Tài liệu này hướng dẫn chi tiết cách thiết lập và vận hành **Chế độ Kiosk (LockTask Mode & Device Owner)** cho ứng dụng **PeopleDetector** trên máy tính bảng Samsung Tablet (Android).

---

## 1. Giới thiệu giải pháp Kiosk Mode

Giải pháp Kiosk Mode được thiết kế riêng cho việc cố định thiết bị tại các điểm quét khuôn mặt / điểm danh tự động:

- **Khóa màn hình chuyên dụng (LockTask Mode)**: Ứng dụng chạy toàn màn hình, vô hiệu hóa thanh điều hướng (Home, Back, Recent apps) và thanh thông báo trạng thái (Status Bar / Notification Center).
- **Tự động khởi động khi mở máy (`BOOT_COMPLETED`)**: Máy tính bảng khi được cắm sạc hoặc khởi động lại sẽ tự động mở ứng dụng PeopleDetector ngay lập tức mà không cần thao tác thủ công.
- **Bảo mật thoát Kiosk qua mã PIN Admin**: Nhân viên hay người dùng thông thường không thể thoát ứng dụng. Chỉ Quản trị viên nhập đúng mã PIN (mặc định: `123456`) mới có thể mở khóa hệ thống.
- **Device Owner Privileges**: Khi cấp quyền qua ADB, Kiosk Mode hoạt động ở mức hệ thống (True Kiosk), không hiện bất kỳ thông báo hỏi hay dialog xác nhận nào từ Android.

---

## 2. Các bước cấp quyền Device Owner qua ADB trên Samsung Tablet

> **LƯU Ý QUAN TRỌNG TỪ ANDROID**:
> Theo chính sách bảo mật của Android OS, lệnh cấp quyền `set-device-owner` chỉ thành công khi trên máy **chưa đăng nhập tài khoản Google hay Samsung Account nào**.

### Bước 1: Chuẩn bị trên máy tính bảng Samsung
1. Vào **Cài đặt (Settings)** -> **Thông tin máy tính bảng (About tablet)** -> **Thông tin phần mềm (Software information)**.
2. Nhấn liên tục 7 lần vào mục **Số hiệu bản tạo (Build number)** cho đến khi xuất hiện thông báo đã bật chế độ nhà phát triển.
3. Quay lại **Cài đặt** -> cuộn xuống chọn **Cài đặt cho người phát triển (Developer options)**.
4. Bật mục **Gỡ lỗi USB (USB debugging)**.
5. Vào **Cài đặt** -> **Tài khoản và sao lưu (Accounts and backup)** -> **Quản lý tài khoản (Manage accounts)**:
   - **Xóa / Đăng xuất toàn bộ tài khoản Google, Samsung Account, v.v.** (sau khi chạy lệnh ADB xong bạn có thể đăng nhập lại bình thường).
   - Tạm thời tắt mã PIN / Mật khẩu khóa màn hình (Lock screen type -> None hoặc Swipe).

### Bước 2: Cài đặt ứng dụng PeopleDetector lên Tablet
Cắm cáp kết nối tablet với máy tính và cài đặt ứng dụng:
```bash
# Kiểm tra thiết bị đã kết nối thành công
adb devices

# Cài đặt file APK (nếu cài qua file build release/debug)
adb install -r android/app/release/app-release.apk
```

### Bước 3: Cấp quyền Device Owner bằng lệnh ADB
Chạy câu lệnh sau trên Terminal máy tính:

```bash
adb shell dpm set-device-owner com.peopledetector/.AdminReceiver
```

- **Kết quả thành công**:
  ```text
  Success: Device owner set to package com.peopledetector
  Active admin set to component {com.peopledetector/com.peopledetector.AdminReceiver}
  ```
- Nếu gặp thông báo lỗi: `Not allowed to set the device owner because there are already some accounts on the device`:
  - Hãy kiểm tra lại **Cài đặt -> Tài khoản** trên tablet và xóa hết tài khoản còn sót lại, sau đó chạy lại lệnh.

---

## 3. Vận hành & Cấu hình Kiosk trong ứng dụng

### 3.1. Quản lý trong màn hình Cài đặt (Settings)
- Truy cập tab **Cài đặt** (Settings):
  - Kiểm tra trạng thái **Quyền Device Owner**: `Đã kích hoạt` (Màu xanh).
  - Kiểm tra trạng thái **Trạng thái LockTask**: `Đang khóa Kiosk` hoặc `Chưa khóa`.
  - **Tự động ghim Kiosk**: Bật công tắc này để ứng dụng tự động khóa Kiosk mỗi khi người dùng truy cập màn hình Tablet Detector.
  - **Đổi mã PIN Quản trị viên**: Nhấn nút để thay đổi mã PIN thoát Kiosk (mặc định: `123456`, tối thiểu 4 chữ số, lưu trữ bảo mật trên MMKV).

### 3.2. Sử dụng tại màn hình nhận diện (Tablet Detector)
- Tại màn hình nhận diện (`TabletDetectorScreen`):
  - Trên **Thanh Header** hoặc thanh công cụ **Dưới cùng (BottomActions)** có nút biểu tượng ổ khóa:
    - Nếu Kiosk đang tắt: Bấm nút để **Kích hoạt Kiosk Mode ngay**.
    - Nếu Kiosk đang bật: Bấm nút sẽ hiển thị **Hộp thoại Thoát Kiosk**.
  - Nhập mã PIN Quản trị viên (mặc định: `123456`) trên bàn phím số chuyên dụng -> Nhấn **Xác nhận Thoát** để mở khóa Android.

---

## 4. Gỡ bỏ quyền Device Owner (Khi cần gỡ ứng dụng hoặc bảo trì)

Khi muốn gỡ bỏ ứng dụng hoặc trả lại máy tính bảng về trạng thái bình thường:

```bash
# Cách 1: Hủy quyền Admin Receiver
adb shell dpm remove-active-admin com.peopledetector/.AdminReceiver

# Cách 2: Gỡ hoàn toàn ứng dụng khỏi thiết bị
adb uninstall com.peopledetector
```

---

## 5. Khắc Phục Hiện Tượng Tự Thoát Ứng Dụng Hoặc Rơi Vào Màn Hình Khóa Trên Samsung Tablet

Nếu trong quá trình vận hành, máy tính bảng thỉnh thoảng tự thoát ứng dụng hoặc hiện màn hình khóa yêu cầu vuốt/mở lại, hãy cấu hình 4 mục sau trên Samsung Tablet:

### 5.1. Tắt hoàn toàn Màn hình khóa của Samsung (BẮT BUỘC)
- Vào **Cài đặt (Settings)** -> **Màn hình khóa (Lock screen)**.
- Chọn **Kiểu khóa màn hình (Lock screen type)** -> Chọn **Không có (None)** (Không chọn Vuốt, PIN hay Mật khẩu).
- *Lý do*: Theo chính sách bảo mật Android, nếu máy có đặt mã PIN/Mật khẩu hoặc kiểu khóa Vuốt, hệ điều hành sẽ chặn Device Owner tắt Keyguard. Khi đặt là "Không có", máy tính bảng sẽ không bao giờ xuất hiện màn hình khóa.

### 5.2. Tắt tính năng tự khởi động lại ban đêm của Samsung
- Vào **Cài đặt (Settings)** -> **Chăm sóc thiết bị (Device care)**.
- Chọn **Tự động tối ưu hóa (Auto optimization)**.
- **TẮT mục "Tự khởi động lại khi cần thiết" (Auto restart when needed)**.
- *Lý do*: Samsung One UI thường tự âm thầm khởi động lại tablet vào khoảng 3h sáng để dọn dẹp bộ nhớ.

### 5.3. Bỏ giới hạn Pin (Battery Optimization) cho PeopleDetector
- Vào **Cài đặt (Settings)** -> **Ứng dụng (Apps)** -> Chọn **PeopleDetector**.
- Chọn mục **Pin (Battery)** -> Chọn **Không hạn chế (Unrestricted)** (thay vì Tối ưu hóa hoặc Hạn chế).
- Vào **Chăm sóc thiết bị (Device care)** -> **Pin (Battery)** -> **Giới hạn sử dụng dưới nền (Background usage limits)** -> Đảm bảo PeopleDetector KHÔNG nằm trong danh sách "Ứng dụng nghỉ sâu" (Deep sleeping apps).

### 5.4. Luôn cắm sạc nguồn 24/7
- Kiosk đã được cấu hình tự động kích hoạt cờ hệ thống `STAY_ON_WHILE_PLUGGED_IN`. Khi cắm sạc liên tục, màn hình tablet sẽ **luôn luôn sáng 100%**, không bao giờ bị tắt màn hình (Screen Timeout).
