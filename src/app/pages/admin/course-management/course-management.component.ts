import { Component, OnInit, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CourseService, Course } from '../../../services/course.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
@Component({
  selector: 'app-course-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarWrapperComponent, ProfileComponent, NotificationComponent],
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.scss']
})
export class CourseManagementComponent implements OnInit, AfterViewInit {
  courses: Course[] = [];
  isCreating = false;
  isViewing = false;
  // Filter properties
  selectedCategoryFilter: string = '0'; // Change to string to match select value
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 6;

  // Reset to first page when filters change
  onFilterChange(): void {
    this.currentPage = 1;
  }

  courseForm = {
    title: '',
    description: '',
    categoryId: 0,
    instructorId: 0,
    status: '',
    price: 0
  };
  selectedCourse: Course | null = null;
  selectedCourseId: number | null = null;
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  // Profile component properties
  username: string = '';
  userRole: string = '';
  avatarUrl: string = '';

  instructors: any[] = [];
  categories: any[] = [];

  constructor(
    private courseService: CourseService,
    private sessionService: SessionService,
    private userService: UserService,
    private notificationService: NotificationService,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    // Load data only after view is initialized and only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.loadCourses();
      this.loadInstructors();
      this.loadCategories();
    }
  }

  ngOnInit(): void {
    // Initialize user profile
    this.initializeUserProfile();
  }

  loadCourses(): void {
    this.courseService.getCourses().subscribe({
      next: (data) => {
        this.courses = data;
      },
      error: (err) => {
        console.error('❌ Lỗi khi lấy danh sách khóa học:', err);
      }
    });
  }

  loadInstructors(): void {
    // SSR-safe token injection
    let headers: any = {};
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    this.http.get<any[]>('http://localhost:8080/api/users/list?role=instructor', { headers })
      .subscribe({
        next: (data) => {
          this.instructors = data;
        },
        error: (err) => {
          console.error('❌ Lỗi khi lấy instructor:', err);
        }
      });
  }

  loadCategories(): void {
    // SSR-safe token injection
    let headers: any = {};
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    this.http.get<any[]>('http://localhost:8080/api/categories/list', { headers })
      .subscribe({
        next: (data) => {
          this.categories = data;
        },
        error: (err) => {
          console.error('❌ Lỗi khi lấy categories:', err);
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImageFile = input.files[0];
      this.imagePreviewUrl = URL.createObjectURL(this.selectedImageFile);
    }
  }

  startCreating(): void {
    this.resetForm();
    this.isCreating = true;
    this.isViewing = false;
  }

  cancelCreating(): void {
    this.resetForm();
    this.isCreating = false;
  }

  cancelEditing(): void {
    this.resetForm();
    this.isViewing = false;
    this.selectedCourseId = null;
  }

  submitCourse(): void {
    const { title, description, categoryId, instructorId, status, price } = this.courseForm;

    if (!title || !description || !categoryId || !instructorId || !status || !price) {
      this.notificationService.warning('Thông tin chưa đầy đủ', 'Vui lòng nhập đầy đủ tất cả các trường bắt buộc.');
      return;
    }

    if (!this.selectedImageFile) {
      this.notificationService.warning('Thiếu ảnh khóa học', 'Vui lòng chọn ảnh khóa học.');
      return;
    }

    this.courseService.createCourse(this.courseForm, this.selectedImageFile).subscribe({
      next: (res) => {
        const message = typeof res === 'string' ? res : res?.message || 'Khóa học đã được tạo thành công!';
        this.notificationService.success('Tạo khóa học thành công', message);
        this.resetForm();
        this.isCreating = false;
        this.loadCourses();
      },
      error: (err) => {
        const msg = typeof err.error === 'string' ? err.error : err.error?.message || 'Có lỗi xảy ra khi tạo khóa học!';
        this.notificationService.error('Tạo khóa học thất bại', msg);
      }
    });
  }
viewCourse(course: Course): void {
  this.selectedCourse = { ...course };
  this.selectedCourseId = (course as any).id ?? (course as any).courseId ?? null;
  
  console.log('🔍 Debug viewCourse:', {
    course: course,
    selectedCourseId: this.selectedCourseId,
    courseId: (course as any).courseId,
    id: (course as any).id
  });
  
  if (!this.selectedCourseId) {
    console.warn('⚠️ Không tìm thấy trường id hoặc courseId trong đối tượng course:', course);
  }
  
  this.imagePreviewUrl = course.thumbnailUrl
    ? `http://localhost:8080/images/courses/${course.thumbnailUrl}`
    : null;

  // Đồng bộ dữ liệu vào selectedCourse (để binding trực tiếp trong popup)
  // Không cần gán vào courseForm nữa
  this.isViewing = true;
  this.isCreating = false;
}
updateCourse(): void {
  if (!this.selectedCourseId || !this.selectedCourse) {
    this.notificationService.error('Lỗi cập nhật', 'Không tìm thấy ID khóa học để cập nhật!');
    return;
  }

  const { title, description, categoryId, instructorId, status, price } = this.selectedCourse;

  if (!title || !description || !categoryId || !instructorId || !status || !price) {
    this.notificationService.warning('Thông tin chưa đầy đủ', 'Vui lòng nhập đầy đủ tất cả các trường.');
    return;
  }

  const coursePayload = {
    courseId: this.selectedCourseId,
    title,
    description,
    categoryId,
    instructorId,
    status,
    price,
    thumbnailUrl: this.selectedCourse?.thumbnailUrl || '',
    instructorImage: this.selectedCourse?.instructorImage || ''
  };

  const formData = new FormData();
  formData.append(
    'course',
    new Blob([JSON.stringify(coursePayload)], { type: 'application/json' })
  );
  if (this.selectedImageFile) {
    formData.append('image', this.selectedImageFile);
  }

  this.http.put(`http://localhost:8080/api/courses/${this.selectedCourseId}`, formData, {
    responseType: 'text'
  }).subscribe({
    next: (res) => {
      this.notificationService.success('Cập nhật thành công', res || 'Khóa học đã được cập nhật thành công!');
      this.resetForm();
      this.isViewing = false;
      this.loadCourses();
    },
    error: (err) => {
      if (err.status === 403) {
        this.notificationService.error('Lỗi phân quyền', 'Bạn không có quyền cập nhật khóa học này. Vui lòng kiểm tra token hoặc quyền admin.');
      } else {
        const msg = typeof err.error === 'string'
          ? err.error
          : (err.error as any)?.message || 'Có lỗi xảy ra khi cập nhật!';
        this.notificationService.error('Cập nhật thất bại', msg);
      }
    }
  });
}



  resetForm(): void {
    this.courseForm = {
      title: '',
      description: '',
      categoryId: 0,
      instructorId: 0,
      status: '',
      price: 0
    };
    this.selectedCourse = null;
    this.selectedCourseId = null;
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }
  deleteSelectedCourse(): void {
  console.log('🔍 Debug deleteSelectedCourse:', {
    selectedCourseId: this.selectedCourseId,
    selectedCourse: this.selectedCourse
  });
  
  if (!this.selectedCourseId) {
    alert('❌ Không tìm thấy ID khóa học để xóa!');
    return;
  }

  // Kiểm tra token trước khi thực hiện API call
  const token = localStorage.getItem('token');
  if (!token) {
    this.notificationService.error('Chưa đăng nhập', 'Vui lòng đăng nhập lại để thực hiện thao tác này.');
    return;
  }

  // Kiểm tra token có hết hạn không
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log('🔍 Token check:', {
      tokenExp: payload.exp,
      currentTime: currentTime,
      expired: payload.exp <= currentTime,
      role: payload.role,
      userId: payload.userId
    });
    
    if (payload.exp <= currentTime) {
      this.notificationService.error('Phiên hết hạn', 'Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.');
      localStorage.removeItem('token');
      return;
    }

    // Kiểm tra quyền admin
    if (!payload.role || !payload.role.includes('admin')) {
      this.notificationService.error('Không có quyền', 'Bạn không có quyền ADMIN để xóa khóa học!');
      return;
    }
  } catch (error) {
    console.error('❌ Token không hợp lệ:', error);
    alert('❌ Token không hợp lệ! Vui lòng đăng nhập lại.');
    localStorage.removeItem('token');
    return;
  }

  // Hiển thị warning message chi tiết trước khi confirm
  const courseName = this.selectedCourse?.title || 'khóa học này';
  const warningMessage = `⚠️ CẢNH BÁO XÓA KHÓA HỌC

📚 Khóa học: "${courseName}"

🔸 Nếu khóa học có videos → XÓA SẼ THẤT BẠI
🔸 Nếu khóa học có học viên đăng ký → XÓA SẼ THẤT BẠI  
🔸 Cần xóa TẤT CẢ dữ liệu liên quan trước

💡 HƯỚNG DẪN:
1. Xóa tất cả videos thuộc khóa học
2. Xóa đăng ký học viên (nếu có)
3. Quay lại xóa khóa học

⚠️ HÀNH ĐỘNG KHÔNG THỂ HOÀN TÁC!

Bạn có chắc chắn muốn tiếp tục?`;

  if (!confirm(warningMessage)) return;

  console.log('🚀 Đang gọi API xóa khóa học với ID:', this.selectedCourseId);

  this.courseService.deleteCourse(this.selectedCourseId).subscribe({
    next: (res) => {
      console.log('✅ Delete success:', res);
      alert('✅ XÓA KHÓA HỌC THÀNH CÔNG!\n\nKhóa học đã được xóa khỏi hệ thống.');
      this.loadCourses();
      this.resetForm();
    },
    error: (err) => {
      console.log('ℹ️ API Error Response:', err);
      
      // Enhanced logging cho debug
      console.log('🔍 Error details:', {
        status: err.status,
        statusText: err.statusText,
        errorMessage: err.error,
        message: err.message
      });
      
      if (err.status === 409) {
        // ✅ CONFLICT - Course có dữ liệu liên quan (constraint)
        console.log('✅ 409 Conflict - Course has related data');
        alert(`🚫 KHÔNG THỂ XÓA KHÓA HỌC!

📚 Khóa học "${courseName}" đang có dữ liệu liên quan:
🔸 Videos thuộc khóa học này
🔸 Học viên đã đăng ký 
🔸 Dữ liệu khác trong hệ thống

💡 CÁC BƯỚC CẦN LÀM:
1️⃣ Vào "Quản lý Videos" → Xóa videos thuộc khóa học
2️⃣ Kiểm tra và xóa đăng ký học viên (nếu có)
3️⃣ Quay lại đây để xóa khóa học

✅ Đây là cơ chế bảo vệ dữ liệu, không phải lỗi hệ thống.`);
        
      } else if (err.status === 403) {
        // ⛔ Authentication/Authorization issue
        console.log('⚠️ 403 Forbidden error detected');
        alert(`⛔ LỖI PHÂN QUYỀN (403 Forbidden)

🔐 Có thể do:
• Token hết hạn hoặc không hợp lệ
• Tài khoản không có quyền ADMIN
• Session đã hết hạn

💡 GIẢI PHÁP:
1️⃣ Đăng xuất và đăng nhập lại
2️⃣ Kiểm tra role ADMIN trong profile
3️⃣ Liên hệ admin để cấp quyền`);
        
      } else if (err.status === 404) {
        // 📭 Course not found
        alert(`� KHÔNG TÌM THẤY KHÓA HỌC

Khóa học có thể đã được xóa hoặc không tồn tại.`);
        this.loadCourses(); // Refresh list
        
      } else {
        // ❌ Other errors
        console.log('❌ Unhandled error type:', err.status);
        const msg = err.error || err.message || 'Xóa thất bại!';
        alert(`❌ LỖI HỆ THỐNG!

Status: ${err.status}
Message: ${msg}`);
      }
    }
  });
}

getFilteredCourses(): Course[] {
  const term = this.searchTerm?.trim().toLowerCase() || '';
  
  return this.courses.filter(course => {
    // Search term filter: If no search term, or title contains search term
    const matchesSearchTerm = !term || course.title?.toLowerCase().includes(term);
    
    // Category filter: If "All categories" ('0') or matches selected category
    const matchesCategory = this.selectedCategoryFilter === '0' || course.categoryId === parseInt(this.selectedCategoryFilter);
    
    return matchesSearchTerm && matchesCategory;
  });
}

getPagedCourses(): Course[] {
  const filtered = this.getFilteredCourses();
  const start = (this.currentPage - 1) * this.pageSize;
  return filtered.slice(start, start + this.pageSize);
}

getTotalPages(): number {
  return Math.ceil(this.getFilteredCourses().length / this.pageSize);
}

goToPage(page: number): void {
  if (page < 1 || page > this.getTotalPages()) return;
  this.currentPage = page;
}

// Initialize user profile data from session
private initializeUserProfile() {
  const userInfo = this.userService.getCurrentUserInfo();
  this.username = userInfo.username;
  this.userRole = userInfo.role; // Giữ nguyên role gốc
  this.avatarUrl = userInfo.avatarUrl; // ✅ Sử dụng avatar mặc định từ service
}

// Format role để hiển thị (chữ cái đầu viết hoa)
getDisplayRole(role: string): string {
  const cleanRole = role.replace('ROLE_', '').toLowerCase();
  return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
}

// Profile component event handlers
onProfileUpdate() {
  console.log('Profile update requested');
}

  navigateToLessonManagement() {
    this.router.navigate(['/courses']);
  }

  onLogout() {
    this.sessionService.logout();
  }
}