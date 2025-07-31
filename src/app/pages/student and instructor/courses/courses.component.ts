import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, SidebarWrapperComponent, ProfileComponent, NotificationComponent],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  courses: any[] = [];
  enrolledCourses: any[] = [];
  availableCourses: any[] = [];
  loading = false;
  userRole: string = '';
  userName: string = '';
  userId: number = 0;
  
  // Profile component properties
  username: string = '';
  avatarUrl: string = '';

  constructor(
    private apiService: ApiService,
    public sessionService: SessionService,
    private notificationService: NotificationService,
    private router: Router,
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.initializeUserProfile();
    this.loadUserInfo();
    // Chỉ load courses nếu đang trong browser (có token)
    if (isPlatformBrowser(this.platformId)) {
      this.loadCourses();
    }
  }

  // Helper method để hiển thị thông báo
  private showAlert(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (type === 'success') {
      this.notificationService.success('Thành công', message);
    } else if (type === 'error') {
      this.notificationService.error('Lỗi', message);
    } else if (type === 'warning') {
      this.notificationService.warning('Cảnh báo', message);
    } else {
      this.notificationService.info('Thông báo', message);
    }
  }

  // Load thông tin user từ token hoặc API
  loadUserInfo() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT token để lấy thông tin user
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT payload:', payload);
          this.userRole = payload.role || 'student';
          this.userName = payload.sub || 'Unknown';
          this.userId = payload.id || payload.userId || 0;
          console.log('User info loaded:', { role: this.userRole, name: this.userName, userId: this.userId });
        } catch (error) {
          console.error('Error decoding token:', error);
          this.userRole = 'student';
        }
      } else {
        // Không có token, redirect về login
        this.router.navigate(['/login']);
      }
    }
  }

  // Load danh sách khóa học theo role
  loadCourses() {
    this.loading = true;
    
    if (this.sessionService.isStudent()) {
      // Sinh viên: Lấy tất cả khóa học kèm trạng thái đăng ký
      this.apiService.getAllCoursesWithStatus(this.userId).subscribe({
        next: (courses) => {
          this.courses = courses;
          // Phân chia courses thành enrolled và available
          this.enrolledCourses = courses.filter(course => course.enrolled);
          this.availableCourses = courses.filter(course => !course.enrolled);
          this.loading = false;
          console.log('Student courses loaded:', { 
            total: courses.length, 
            enrolled: this.enrolledCourses.length, 
            available: this.availableCourses.length 
          });
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else if (this.sessionService.isInstructor()) {
      // Giảng viên: Chỉ lấy khóa học của mình
      this.apiService.getCoursesByUser().subscribe({
        next: (courses) => {
          this.courses = courses;
          this.loading = false;
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else if (this.sessionService.isAdmin()) {
      // Admin: Lấy tất cả khóa học để xem tổng quan
      this.apiService.getAllCourses().subscribe({
        next: (courses) => {
          this.courses = courses;
          this.loading = false;
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else {
      // Role không xác định: hiển thị trang trống
      this.courses = [];
      this.enrolledCourses = [];
      this.availableCourses = [];
      this.loading = false;
    }
  }

  // Load khóa học của giảng viên
  loadInstructorCourses() {
    this.apiService.getCoursesByUser().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
        console.log('Instructor courses:', courses);
        
        if (courses.length === 0) {
          console.log('Instructor has no courses');
        }
      },
      error: (err) => {
        console.error('Lỗi khi tải khóa học của giảng viên:', err);
        this.courses = []; // Set empty array instead of keeping old data
        this.handleLoadError(err);
      }
    });
  }

  // Load khóa học sinh viên đã đăng ký
  loadStudentEnrolledCourses() {
    this.apiService.get<any[]>('/enrollments/my-courses').subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
        console.log('Student enrolled courses:', courses);
        
        if (courses.length === 0) {
          console.log('Student has no enrolled courses');
        }
      },
      error: (err) => {
        console.error('Lỗi khi tải khóa học đã đăng ký:', err);
        this.courses = []; // Set empty array instead of keeping old data
        this.handleLoadError(err);
      }
    });
  }

  // Xử lý lỗi khi load
  handleLoadError(err: any) {
    this.loading = false;
    if (err.status === 401) {
      this.showAlert('Bạn cần đăng nhập để xem khóa học', 'warning');
      this.router.navigate(['/login']);
    } else if (err.status === 403) {
      this.showAlert('Bạn không có quyền truy cập', 'error');
    } else {
      this.showAlert('Lỗi khi tải danh sách khóa học', 'error');
    }
  }

  // Vào trang học/quản lý khóa học
  enterCourse(course: any) {
    if (this.sessionService.isInstructor()) {
      this.router.navigate(['/course-home'], { queryParams: { courseId: course.courseId } });
    } else if (this.sessionService.isStudent()) {
      if (course.enrolled) {
        this.router.navigate(['/course-home'], { 
          queryParams: { 
            courseId: course.courseId,
            courseName: course.title 
          } 
        });
      } else {
        if (confirm('Bạn chưa đăng ký khóa học này. Đăng ký ngay?')) {
          this.loading = true; // Hiển thị loading khi đăng ký
          this.apiService.post('/enrollments/register', { courseId: course.courseId })
            .subscribe({
              next: (response: any) => {
                this.loading = false;
                console.log('Enrollment response:', response);
                
                if (response && response.success) {
                  this.showAlert(response.message || 'Đăng ký thành công!', 'success');
                  course.enrolled = true;
                  this.router.navigate(['/course-home'], { 
                    queryParams: { 
                      courseId: course.courseId,
                      courseName: course.title 
                    } 
                  });
                } else {
                  this.showAlert(response?.message || 'Có lỗi xảy ra!');
                }
              },
              error: (error) => {
                this.loading = false;
                console.error('Enrollment error:', error);
                
                if (error.status === 400 && error.error && error.error.message) {
                  this.showAlert(error.error.message);
                  if (error.error.message.includes('đã đăng ký')) {
                    course.enrolled = true; // Cập nhật trạng thái
                  }
                } else if (error.status === 401) {
                  this.showAlert('Bạn cần đăng nhập để đăng ký khóa học!');
                  this.router.navigate(['/login']);
                } else if (error.status === 403) {
                  this.showAlert('Bạn không có quyền đăng ký khóa học này!');
                } else {
                  // Xử lý trường hợp response text thay vì JSON
                  let errorMessage = 'Đăng ký thất bại: ';
                  if (error.error && typeof error.error === 'string') {
                    errorMessage += error.error;
                  } else if (error.error && error.error.message) {
                    errorMessage += error.error.message;
                  } else if (error.message) {
                    errorMessage += error.message;
                  } else {
                    errorMessage += 'Lỗi không xác định';
                  }
                  this.showAlert(errorMessage);
                }
              }
            });
        }
      }
    } else {
      // Admin hoặc role khác
      this.router.navigate(['/course-home'], { 
        queryParams: { 
          courseId: course.courseId,
          courseName: course.title 
        } 
      });
    }
  }

  // Xem chi tiết khóa học -> chuyển sang trang course-home
  viewCourseDetails(course: any) {
    console.log('View course details:', course);
    
    if (this.sessionService.isInstructor()) {
      // Giảng viên: Chuyển sang trang course-home
      this.router.navigate(['/course-home'], { 
        queryParams: { 
          courseId: course.courseId,
          courseName: course.title 
        } 
      });
    } else if (this.sessionService.isStudent()) {
      // Sinh viên: Chuyển sang trang course-home
      this.router.navigate(['/course-home'], { 
        queryParams: { 
          courseId: course.courseId,
          courseName: course.title 
        } 
      });
    } else {
      // Admin hoặc role khác
      this.router.navigate(['/course-home'], { 
        queryParams: { 
          courseId: course.courseId,
          courseName: course.title 
        } 
      });
    }
  }

  // Format giá tiền
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  // Format ngày
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  // Helper methods để handle khác nhau giữa CourseDTO và EnrollmentsDTO
  getCourseTitle(course: any): string {
    return course.title || course.courseTitle || course.courseName || 'Không có tiêu đề';
  }

  getCourseDescription(course: any): string {
    return course.description || 'Không có mô tả';
  }

  getCoursePrice(course: any): number {
    return course.price || 0;
  }

  getCourseCreatedDate(course: any): string {
    return course.createdAt || course.enrolledAt || new Date().toISOString();
  }

  // Initialize user profile data from session
  private initializeUserProfile() {
    const userInfo = this.userService.getCurrentUserInfo();
    this.username = userInfo.username;
    this.userRole = userInfo.role; // Giữ nguyên role gốc để sử dụng trong logic
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

  onLogout() {
    this.sessionService.logout();
  }
}
