import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebaradminComponent } from '../../../components/sidebaradmin/sidebaradmin.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, SidebaradminComponent, ProfileComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  
  userName: string = '';
  userRole: string = '';
  
  // Profile component properties
  username: string = '';
  avatarUrl: string = '';

  constructor(private sessionService: SessionService, private userService: UserService) {}

  ngOnInit() {
    this.initializeUserProfile();
  }

  initializeUserProfile() {
    const userInfo = this.userService.getCurrentUserInfo();
    this.userName = userInfo.username;
    this.userRole = userInfo.role; // Giữ nguyên role gốc
    this.username = userInfo.username;
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
