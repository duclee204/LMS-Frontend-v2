import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { CategoryService } from '../../../services/category.service';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';

@Component({
  standalone: true,
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss'],
  imports: [CommonModule, FormsModule, SidebarWrapperComponent, ProfileComponent, NotificationComponent]
})
export class CategoryComponent implements OnInit {
  searchName: string = '';
  searchDescription: string = '';
  categories: any[] = [];

  showCreateForm = false;
  isEditing = false;
  editId: number | null = null;
  
  // Thêm biến để kiểm tra role
  userRole: string = '';
  isAdmin: boolean = false;

  // Profile component properties
  username: string = '';
  avatarUrl: string = '';

  newCategory = {
    name: '',
    description: ''
  };

  constructor(
    private http: HttpClient,
    private categoryService: CategoryService,
    private apiService: ApiService,
    private sessionService: SessionService,
    private userService: UserService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.initializeUserProfile();
    this.loadUserRole();
    // Chỉ fetch categories khi đang trong browser (có token)
    if (isPlatformBrowser(this.platformId)) {
      this.fetchCategories();
    }
  }

  // Initialize user profile
  initializeUserProfile(): void {
    const userInfo = this.userService.getCurrentUserInfo();
    this.username = userInfo.username;
    // Sử dụng role gốc từ token (có ROLE_ prefix)
    this.userRole = this.getRoleFromToken();
    this.avatarUrl = userInfo.avatarUrl; // ✅ Sử dụng avatar mặc định từ service
    
    // Sử dụng SessionService để check admin
    this.isAdmin = this.sessionService.isAdmin();
  }

  // Lấy role gốc từ token (có ROLE_ prefix)
  getRoleFromToken(): string {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.role || '';
        } catch (error) {
          console.error('Error decoding token:', error);
          return '';
        }
      }
    }
    return '';
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

  // Load thông tin role từ JWT token
  loadUserRole(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userRole = payload.role || '';
          this.isAdmin = this.sessionService.isAdmin();
          console.log('🔍 Category - User role:', this.userRole, 'isAdmin:', this.isAdmin);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
  }

  // Helper method để hiển thị thông báo
  private showAlert(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
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

  fetchCategories(): void {
    // Kiểm tra platform và role trước khi gọi API
    if (!isPlatformBrowser(this.platformId)) {
      console.log('🔍 Frontend - Skipping API call in SSR');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔍 Frontend - No token found, skipping API call');
      this.showAlert('Bạn cần đăng nhập để xem danh mục.');
      return;
    }

    console.log('🔍 Frontend - Making request to categories API...');
    console.log('🔍 Frontend - User role:', this.userRole);
    console.log('🔍 Frontend - Is admin:', this.isAdmin);
    console.log('🔍 Frontend - Token exists:', !!token);
    console.log('🔍 Frontend - Token value:', token?.substring(0, 50) + '...');

    // Tạo query string cho params
    let queryString = '';
    if (this.searchName || this.searchDescription) {
      const params = new URLSearchParams();
      if (this.searchName) params.set('name', this.searchName);
      if (this.searchDescription) params.set('description', this.searchDescription);
      queryString = '?' + params.toString();
    }

    // Sử dụng ApiService với query string
    this.apiService.get<any[]>(`/categories/list${queryString}`).subscribe({
      next: (data) => {
        this.categories = data;
        console.log('✅ Categories loaded successfully:', data);
      },
      error: (err) => {
        console.error('❌ Error fetching categories:', err);
        console.error('❌ Error status:', err.status);
        console.error('❌ Error statusText:', err.statusText);
        console.error('❌ Error headers:', err.headers);
        console.error('❌ Error url:', err.url);
        
        if (err.status === 403) {
          this.showAlert('Bạn không có quyền xem danh sách danh mục. Vui lòng đăng nhập với quyền phù hợp.');
        } else if (err.status === 401) {
          this.showAlert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          this.showAlert('Có lỗi xảy ra khi tải danh sách danh mục.');
        }
      }
    });
  }

  // 👉 Gọi khi ấn nút "Chỉnh sửa"
  editCategory(category: any): void {
    this.newCategory = { name: category.name, description: category.description };
    this.editId = category.categoryId;
    this.isEditing = true;
    this.showCreateForm = true;
  }

  // 👉 Gọi khi ấn "Lưu" hoặc "Cập nhật"
  submitCategory(): void {
    if (this.isEditing && this.editId !== null) {
      // PUT: cập nhật danh mục
      this.http.put(`http://localhost:8080/api/categories/${this.editId}`, this.newCategory, {
        responseType: 'text'
      }).subscribe({
        next: (res) => {
          this.showAlert(res, 'success');
          this.resetForm();
          this.fetchCategories();
        },
        error: (err) => {
          this.showAlert('Cập nhật danh mục thất bại', 'error');
          console.error(err);
        }
      });
    } else {
      // POST: tạo mới danh mục
      this.http.post('http://localhost:8080/api/categories', this.newCategory, {
        responseType: 'text'
      }).subscribe({
        next: (res) => {
          this.showAlert(res);
          this.resetForm();
          this.fetchCategories();
        },
        error: (err) => {
          this.showAlert('Tạo danh mục thất bại');
          console.error(err);
        }
      });
    }
  }
deleteCategory(): void {
  if (this.editId === null) {
    this.showAlert('Không tìm thấy ID danh mục để xóa.');
    return;
  }

  if (isPlatformBrowser(this.platformId) && confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
    this.http.delete(`http://localhost:8080/api/categories/${this.editId}`, { responseType: 'text' })
      .subscribe({
        next: (res) => {
          this.showAlert(res);
          this.fetchCategories();
          this.cancelCreate();
        },
        error: (err) => {
          console.error('Lỗi khi xóa:', err);
          this.showAlert('Xóa thất bại.');
        }
      });
  }
}
  cancelCreate(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.newCategory = { name: '', description: '' };
    this.isEditing = false;
    this.editId = null;
    this.showCreateForm = false;
  }
}
