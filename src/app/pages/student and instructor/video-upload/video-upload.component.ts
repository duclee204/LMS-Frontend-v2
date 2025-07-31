import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';
import { ModuleService, ModuleItem } from '../../../services/module.service';
import { CourseService } from '../../../services/course.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { UserService } from '../../../services/user.service';

@Component({
  standalone: true,
  selector: 'app-video-upload',
  imports: [CommonModule, FormsModule, SidebarWrapperComponent, ProfileComponent, NotificationComponent],
  templateUrl: './video-upload.component.html',
  styleUrls: ['./video-upload.component.scss']
})
export class VideoUploadComponent implements OnInit {
  title = '';
  description = '';
  published = false; // Default to draft status
  selectedFile: File | null = null;
  successMessage = false;
  courseId: number | null = null; // Dynamic courseId based on user selection
  moduleId: number | null = null; // Selected module ID
  courses: any[] = []; // Danh sách courses của user
  modules: ModuleItem[] = []; // Danh sách modules của course đã chọn
  loading = false;
  uploadProgress = 0; // Progress bar
  maxFileSize = 500 * 1024 * 1024; // 500MB in bytes

  // Profile component properties
  username: string = '';
  userRole: string = '';
  avatarUrl: string = '';
  isInstructor: boolean = false;

  // Navigation properties
  currentPage: string = 'Video';
  leftMenuHidden: boolean = false;
  courseInfo: any = null;

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute,
    private apiService: ApiService,
    private sessionService: SessionService,
    private moduleService: ModuleService,
    private courseService: CourseService,
    private userService: UserService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.initializeUserProfile();
    // Get courseId from route params
    this.route.queryParams.subscribe(params => {
      if (params['courseId']) {
        this.courseId = +params['courseId'];
        console.log('📚 Course ID from route:', this.courseId);
        this.loadCourseInfo();
        this.loadModules(); // Load modules for the specific course
      }
    });
    this.loadUserCourses();
  }

  // Initialize user profile
  initializeUserProfile(): void {
    const userInfo = this.userService.getCurrentUserInfo();
    this.username = userInfo.username;
    this.userRole = userInfo.role; // Giữ nguyên role gốc
    this.avatarUrl = userInfo.avatarUrl; // ✅ Sử dụng avatar mặc định từ service
    this.isInstructor = this.sessionService.isInstructor();
  }

  // Format role để hiển thị (chữ cái đầu viết hoa)
  getDisplayRole(role: string): string {
    const cleanRole = role.replace('ROLE_', '').toLowerCase();
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
  }

  onProfileUpdate(): void {
    this.initializeUserProfile();
  }

  onLogout(): void {
    this.sessionService.logout();
  }

  // Navigate to learn-online page to view all videos
  navigateToLearnOnline(): void {
    console.log('📍 Navigating to Learn Online (All Videos)');
    
    // Navigate to learn-online page to view all videos
    this.router.navigate(['/learn-online'], {
      queryParams: { 
        courseId: this.courseId,
        courseName: this.courses.find(c => c.courseId === this.courseId)?.title || `Course ${this.courseId}`
      }
    });
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

  // Load courses của user hiện tại (chỉ instructor mới có courses để upload)
  loadUserCourses() {
    this.loading = true;
    this.apiService.getCoursesByUser().subscribe({
      next: (courses) => {
        this.courses = courses;
        // Tự động chọn course đầu tiên nếu có
        if (courses.length > 0) {
          this.courseId = courses[0].courseId;
          this.loadModules(); // Load modules for the first course
        }
        this.loading = false;
        console.log('Loaded courses:', courses);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách khóa học:', err);
        if (err.status === 401) {
          this.showAlert('Bạn cần đăng nhập để xem khóa học', 'warning');
        } else if (err.status === 403) {
          this.showAlert('Bạn không có quyền truy cập (chỉ instructor mới được upload video)', 'error');
        } else {
          this.showAlert('Lỗi khi tải danh sách khóa học', 'error');
        }
        this.loading = false;
      }
    });
  }

  // Load modules when course is selected
  loadModules(): void {
    if (!this.courseId) {
      this.modules = [];
      return;
    }

    console.log('🔄 Loading modules for courseId:', this.courseId);

    this.moduleService.getModulesByCourse(this.courseId).subscribe({
      next: (modules: ModuleItem[]) => {
        this.modules = modules.sort((a, b) => a.orderNumber - b.orderNumber);
        console.log('✅ Modules loaded successfully:', this.modules.length, 'modules');
        
        if (this.modules.length === 0) {
          this.showAlert('Khóa học này chưa có module nào. Vui lòng tạo module trước khi upload video.', 'warning');
        }
      },
      error: (err: any) => {
        console.error('❌ Error loading modules:', err);
        this.modules = [];
        this.showAlert('Lỗi khi tải danh sách module', 'error');
      }
    });
  }

  // Handle course selection change
  onCourseChange(): void {
    console.log('📚 Course changed to:', this.courseId);
    this.moduleId = null; // Reset module selection
    this.loadModules(); // Load modules for new course
  }

  // Handle module selection change
  onModuleChange(): void {
    console.log('📂 Module changed to:', this.moduleId);
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      const file = target.files[0];
      
      // Validate file size (500MB = 500 * 1024 * 1024 bytes)
      if (file.size > this.maxFileSize) {
        this.showAlert(`File quá lớn! Kích thước tối đa cho phép là ${this.maxFileSize / (1024 * 1024)}MB`, 'warning');
        target.value = ''; // Clear input
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('video/')) {
        this.showAlert('Vui lòng chọn file video!', 'warning');
        target.value = ''; // Clear input
        return;
      }
      
      this.selectedFile = file;
      console.log(`Selected file: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }
  }

  onSubmit(): void {
    if (!this.title || !this.description || !this.selectedFile || !this.courseId || !this.moduleId) {
      this.showAlert('Vui lòng điền đầy đủ thông tin, chọn khóa học, chọn module và chọn video.', 'warning');
      return;
    }

    // Kiểm tra kích thước file
    if (this.selectedFile.size > this.maxFileSize) {
      this.showAlert(`Kích thước file vượt quá giới hạn cho phép (${this.maxFileSize / (1024 * 1024)}MB).`);
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.title);
    formData.append('description', this.description);
    formData.append('courseId', this.courseId.toString());
    formData.append('moduleId', this.moduleId.toString()); // Module is now required
    formData.append('published', this.published.toString()); // Add published status

    this.loading = true;

    // Sử dụng ApiService để upload
    this.apiService.uploadVideo(formData).subscribe({
      next: (res: any) => {
        console.log('Upload response:', res);
        this.successMessage = true;
        const statusText = this.published ? 'đã xuất bản' : 'ở trạng thái bản nháp';
        this.showAlert(`Upload video thành công! Video ${statusText}.`, 'success');
        
        // Reset form
        this.title = '';
        this.description = '';
        this.published = false; // Reset to draft
        this.selectedFile = null;
        // Giữ nguyên courseId đã chọn để tiện upload tiếp
        this.loading = false;
        
        setTimeout(() => {
          this.successMessage = false;
        }, 3000); // Ẩn thông báo thành công sau 3 giây
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.loading = false;
        
        if (err.status === 401) {
          this.showAlert('Bạn cần đăng nhập để upload video');
        } else if (err.status === 403) {
          this.showAlert('Bạn không có quyền upload video cho khóa học này (chỉ instructor mới được upload)');
        } else if (err.status === 400) {
          this.showAlert('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file và thông tin.');
        } else if (err.status === 413) {
          this.showAlert('File quá lớn! Vui lòng chọn file nhỏ hơn.');
        } else {
          this.showAlert('Tải lên thất bại! Vui lòng thử lại.');
        }
      }
    });
  }

  // Navigation methods
  toggleLeftMenu(): void {
    this.leftMenuHidden = !this.leftMenuHidden;
  }

  navigateToHome(): void {
    if (this.courseId) {
      this.router.navigate(['/course-home'], { queryParams: { courseId: this.courseId } });
    }
  }

  navigateToDiscussion(): void {
    if (this.courseId) {
      this.router.navigate(['/discussion'], { queryParams: { courseId: this.courseId } });
    }
  }

  navigateToGrades(): void {
    if (this.courseId) {
      if (this.isInstructor) {
        // Navigate to instructor grades management page
        this.router.navigate(['/grades'], { queryParams: { courseId: this.courseId } });
      } else {
        // Navigate to student grades view page
        this.router.navigate(['/student-grades'], { queryParams: { courseId: this.courseId } });
      }
    }
  }

  navigateToModules(): void {
    if (this.courseId) {
      this.router.navigate(['/module'], { queryParams: { courseId: this.courseId } });
    }
  }

  navigateToVideo(): void {
    if (this.courseId) {
      // Check if user is instructor/admin
      if (this.isInstructor) {
        // Navigate to video upload page for instructors
        this.router.navigate(['/video-upload'], { queryParams: { courseId: this.courseId } });
      } else {
        // Navigate to learn online page for students
        this.router.navigate(['/learn-online'], { queryParams: { courseId: this.courseId } });
      }
    }
  }

  navigateToTests(): void {
    if (this.courseId) {
      this.router.navigate(['/exam'], { queryParams: { courseId: this.courseId } });
    }
  }

  // Load course information
  loadCourseInfo(): void {
    if (!this.courseId) return;

    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        this.courseInfo = course;
        console.log('✅ Course info loaded:', course);
      },
      error: (error) => {
        console.error('❌ Error loading course info:', error);
      }
    });
  }
}

