import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [SidebarWrapperComponent, ProfileComponent, CommonModule]
})
export class DashboardComponent implements OnInit {
  userRole: string = '';
  userName: string = '';
  roleDisplayName: string = '';
  
  // Profile component properties
  username: string = '';
  avatarUrl: string = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    public sessionService: SessionService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.checkAdminRedirect();
    this.loadUserInfo();
  }

  // Kiểm tra và redirect admin đến admin dashboard
  checkAdminRedirect() {
    if (this.sessionService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
  }

  // Load thông tin user từ JWT token
  loadUserInfo() {
    if (isPlatformBrowser(this.platformId)) {
      const userInfo = this.userService.getCurrentUserInfo();
      
      this.userRole = userInfo.role; // Giữ nguyên role gốc
      this.userName = userInfo.username;
      this.username = userInfo.username;
      this.avatarUrl = userInfo.avatarUrl; // ✅ Sử dụng avatar mặc định từ service
      
      // Chuyển đổi role thành tên hiển thị
      this.roleDisplayName = this.getRoleDisplayName(userInfo.role);
      
      console.log('User info loaded:', { 
        role: this.userRole, 
        name: this.userName, 
        displayName: this.roleDisplayName,
        avatar: this.avatarUrl
      });
    }
  }

  // Format role để hiển thị (chữ cái đầu viết hoa)
  getDisplayRole(role: string): string {
    const cleanRole = role.replace('ROLE_', '').toLowerCase();
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
  }

  // Chuyển đổi role code thành tên hiển thị
  getRoleDisplayName(role: string): string {
    if (this.sessionService.isAdmin()) {
      return 'Quản trị viên';
    } else if (this.sessionService.isInstructor()) {
      return 'Giảng viên';
    } else if (this.sessionService.isStudent()) {
      return 'Sinh viên';
    } else {
      return 'Người dùng';
    }
  }

  // Profile component event handlers
  onProfileUpdate() {
    console.log('Profile update requested');
  }

  onLogout() {
    this.sessionService.logout();
  }
}
