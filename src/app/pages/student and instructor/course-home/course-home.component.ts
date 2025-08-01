import { Component, OnInit, Inject, PLATFORM_ID, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ModuleService, ModuleItem } from '../../../services/module.service';
import { CourseService } from '../../../services/course.service';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { ApiService } from '../../../services/api.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-course-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent, SidebarWrapperComponent, ProfileComponent],
  templateUrl: './course-home.component.html',
  styleUrls: ['./course-home.component.scss']
})
export class CourseHomeComponent implements OnInit {
  // Component state
  courseId: number | null = null;
  courseInfo: any = null;
  modules: ModuleItem[] = [];
  filteredModules: ModuleItem[] = [];
  searchTerm = '';
  loading = true;
  
  // Users data for admin/instructor view
  courseUsers: any[] = [];
  instructors: any[] = [];
  students: any[] = [];
  filteredUsers: any[] = [];
  
  // Navigation state
  currentPage = 'Home';
  leftMenuHidden = false;
  
  // Profile component properties
  username: string = '';
  userRole: string = '';
  avatarUrl: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private moduleService: ModuleService,
    private courseService: CourseService,
    private sessionService: SessionService,
    private userService: UserService,
    private notificationService: NotificationService,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.initializeUserProfile();
    
    // Ensure left menu is shown by default
    this.leftMenuHidden = false;
    
    // Get courseId from route params
    this.route.queryParams.subscribe(params => {
      this.courseId = params['courseId'] ? +params['courseId'] : null;
      console.log('📚 Course ID from route:', this.courseId);
      
      if (this.courseId) {
        this.loadCourseInfo();
        if (this.isStudent()) {
          // Students don't need to load modules on course home page
          // They can access modules through the dedicated module page
          this.loading = false;
        } else {
          this.loadCourseUsers();
          this.loadModules(); // Only instructors load modules here
        }
      } else {
        // Even without courseId, show the page structure
        console.log('⚠️ No courseId provided');
        this.loading = false;
      }
    });
  }

  // Initialize user profile
  initializeUserProfile(): void {
    const userInfo = this.userService.getCurrentUserInfo();
    this.username = userInfo.username;
    this.userRole = userInfo.role;
    this.avatarUrl = userInfo.avatarUrl;
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
        this.showAlert('Không thể tải thông tin khóa học', 'error');
      }
    });
  }

  // Load users of this course (for admin/instructor)
  loadCourseUsers(): void {
    if (!this.courseId) return;

    this.loading = true;
    // Call API to get users enrolled in this course
    this.apiService.get(`/enrollments/course/${this.courseId}/enrollments`).subscribe({
      next: (response: any) => {
        const users = Array.isArray(response) ? response : response.data || [];
        this.courseUsers = users;
        this.instructors = users.filter((user: any) => user.role === 'ROLE_INSTRUCTOR');
        this.students = users.filter((user: any) => user.role === 'ROLE_STUDENT');
        this.filteredUsers = [...this.courseUsers];
        console.log('✅ Course users loaded:', users.length, 'users');
        console.log('📊 Instructors:', this.instructors.length, 'Students:', this.students.length);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading course users:', error);
        this.showAlert('Không thể tải danh sách người dùng', 'error');
        this.loading = false;
      }
    });
  }

  // Load modules for this course
  loadModules(): void {
    if (!this.courseId) return;

    this.loading = true;
    this.moduleService.getModulesByCourse(this.courseId).subscribe({
      next: (modules: ModuleItem[]) => {
        this.modules = modules.sort((a, b) => a.orderNumber - b.orderNumber);
        this.filteredModules = [...this.modules];
        console.log('✅ Modules loaded:', this.modules.length, 'modules');
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading modules:', error);
        this.showAlert('Không thể tải danh sách module', 'error');
        this.loading = false;
      }
    });
  }

  // Search modules or users
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredModules = [...this.modules];
      this.filteredUsers = [...this.courseUsers];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      
      // Search modules for students
      this.filteredModules = this.modules.filter(module =>
        module.title.toLowerCase().includes(searchLower) ||
        (module.description && module.description.toLowerCase().includes(searchLower))
      );
      
      // Search users for admin/instructor
      this.filteredUsers = this.courseUsers.filter(user =>
        user.username.toLowerCase().includes(searchLower) ||
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }
  }

  // Clear search
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredModules = [...this.modules];
    this.filteredUsers = [...this.courseUsers];
  }

  // View module details
  viewModule(module: ModuleItem): void {
    this.router.navigate(['/module'], { 
      queryParams: { 
        courseId: this.courseId,
        moduleId: module.moduleId
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

  // Navigation methods
  toggleLeftMenu(): void {
    this.leftMenuHidden = !this.leftMenuHidden;
  }

  navigateToHome(): void {
    if (this.courseId) {
      this.router.navigate(['/course-home'], { queryParams: { courseId: this.courseId } });
    } else {
      // Stay on current page if no courseId
      console.log('No courseId available for navigation');
    }
  }

  navigateToDiscussion(): void {
    if (this.courseId) {
      this.router.navigate(['/discussion'], { queryParams: { courseId: this.courseId } });
    } else {
      this.showAlert('Vui lòng chọn một khóa học để tiếp tục', 'warning');
    }
  }

  navigateToGrades(): void {
    if (this.courseId) {
      // Students go to student-grades, instructors/admins go to grades management
      if (this.isStudent()) {
        this.router.navigate(['/student-grades'], { queryParams: { courseId: this.courseId } });
      } else {
        this.router.navigate(['/grades'], { queryParams: { courseId: this.courseId } });
      }
    } else {
      this.showAlert('Vui lòng chọn một khóa học để tiếp tục', 'warning');
    }
  }

  navigateToModules(): void {
    if (this.courseId) {
      this.router.navigate(['/module'], { queryParams: { courseId: this.courseId } });
    } else {
      this.showAlert('Vui lòng chọn một khóa học để tiếp tục', 'warning');
    }
  }

  navigateToVideo(): void {
    if (this.courseId) {
      // Check if user is instructor/admin
      if (this.isInstructor() || this.isAdmin()) {
        // Navigate to video upload page for instructors
        this.router.navigate(['/video-upload'], { queryParams: { courseId: this.courseId } });
      } else {
        // Navigate to learn online page for students
        this.router.navigate(['/learn-online'], { queryParams: { courseId: this.courseId } });
      }
    } else {
      this.showAlert('Vui lòng chọn một khóa học để tiếp tục', 'warning');
    }
  }

  navigateToTests(): void {
    if (this.courseId) {
      this.router.navigate(['/exam'], { queryParams: { courseId: this.courseId } });
    } else {
      this.showAlert('Vui lòng chọn một khóa học để tiếp tục', 'warning');
    }
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

  // Get progress for a module (placeholder - implement based on your needs)
  getModuleProgress(module: ModuleItem): number {
    // TODO: Implement progress calculation based on completed items
    return 0;
  }

  // Check if user can manage content (instructor/admin)
  canManageContent(): boolean {
    const role = this.sessionService.getUserRole();
    return role === 'ROLE_INSTRUCTOR' || role === 'ROLE_ADMIN';
  }

  // Check if current user is student
  isStudent(): boolean {
    const role = this.sessionService.getUserRole();
    return role === 'ROLE_student';
  }

  // Check if current user is instructor
  isInstructor(): boolean {
    const role = this.sessionService.getUserRole();
    return role === 'ROLE_INSTRUCTOR';
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const role = this.sessionService.getUserRole();
    return role === 'ROLE_ADMIN';
  }

  // User management methods
  viewUserProfile(userId: number): void {
    // Navigate to user profile page
    this.router.navigate(['/profile', userId]);
  }

  removeUserFromCourse(userId: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này khỏi khóa học?')) {
      this.apiService.delete(`/enrollments/course/${this.courseId}/user/${userId}`).subscribe({
        next: () => {
          // Remove user from local arrays
          this.courseUsers = this.courseUsers.filter(user => user.id !== userId);
          this.instructors = this.instructors.filter(user => user.id !== userId);
          this.students = this.students.filter(user => user.id !== userId);
          this.onSearch(); // Refresh filtered users
          this.showAlert('Đã xóa người dùng khỏi khóa học thành công!', 'success');
        },
        error: (error) => {
          console.error('Error removing user from course:', error);
          this.showAlert('Có lỗi xảy ra khi xóa người dùng khỏi khóa học!', 'error');
        }
      });
    }
  }
}
