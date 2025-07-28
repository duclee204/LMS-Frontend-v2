# CMC Learn LMS Frontend

Đây là dự án giao diện người dùng (frontend) cho hệ thống quản lý khóa học CMC Learn, được xây dựng bằng Angular 19, SCSS, và tuân thủ thiết kế hiện đại theo Figma.

## Tính năng nổi bật
- Trang đăng nhập hiện đại, responsive, theo đúng thiết kế CMC Learn.
- Sử dụng Angular CLI, SCSS, cấu trúc module rõ ràng.
- Hỗ trợ assets động (ảnh nền, logo, ...).

## Cấu trúc thư mục chính
```
frontend/
├── src/
│   ├── app/
│   │   └── login/         # Component trang đăng nhập
│   ├── assets/            # Ảnh nền, logo, ...
│   └── styles.scss        # Global styles
├── angular.json           # Cấu hình Angular
├── package.json           # Thông tin package & scripts
└── README.md
```

## Cài đặt & chạy dự án
1. Cài đặt dependencies:
   ```bash
   npm install
   ```
2. Chạy server phát triển:
   ```bash
   npm start
   ```
   Truy cập: http://localhost:4200

## Scripts npm
- `npm start`  : Chạy server phát triển (ng serve)
- `npm run build` : Build production
- `npm test`   : Chạy unit test

## Trang đăng nhập mẫu
- Ảnh nền: `src/assets/login-bg.png`
- Logo: `src/assets/logocmc.png`
- Giao diện, màu sắc, kích thước, font... theo đúng Figma CMC Learn.

## Cấu hình assets
Đảm bảo `angular.json` có:
```json
"assets": [
  { "glob": "**/*", "input": "public" },
  { "glob": "**/*", "input": "src/assets", "output": "assets" }
]
```

## Tham khảo
- [Angular CLI](https://angular.dev/tools/cli)
- [Figma thiết kế CMC Learn](#)

---
Mọi đóng góp hoặc thắc mắc vui lòng liên hệ nhóm phát triển CMC Learn.
