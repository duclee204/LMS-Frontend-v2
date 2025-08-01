import { Component, Input, Output, EventEmitter, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProfileUpdateComponent } from '../profile-update/profile-update.component';
import { AvatarService } from '../../services/avatar.service';
import { UserService } from '../../services/user.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ProfileUpdateComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  @Input() username: string = 'User';
  @Input() role: string = 'Student';
  @Input() avatarUrl: string = '';
  @Input() showNotifications: boolean = true;
  @Input() showMessages: boolean = true;

  @Output() profileUpdate = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  profileDropdownVisible = false;
  showProfileUpdateModal = false;

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private avatarService: AvatarService
  ) {}

  ngOnInit() {
    // Thử lấy từ session trước
    const sessionAvatar = this.sessionService.getAvatarUrl();
    if (sessionAvatar && sessionAvatar !== 'assets/pictures/logocmc.png') {
      this.avatarUrl = sessionAvatar;
      console.log('✅ Using cached avatar from session:', this.avatarUrl);
    }

    // Load user data từ API
    this.loadUserFromAPI();
  }

  private loadUserFromAPI() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        this.userService.getCurrentUser().subscribe({
          next: (user) => {
            console.log('👤 User data from API:', user);
            this.username = user.fullName || user.username || this.username;
            this.role = user.role || this.role;

            if (user.avatarUrl) {
              console.log('🖼️ Raw avatar URL from database:', user.avatarUrl);
              const avatarUrl = this.avatarService.getValidAvatarUrl(user.avatarUrl);
              console.log('🖼️ Final avatar URL:', avatarUrl);
              
              // Chỉ cập nhật nếu khác default
              if (avatarUrl !== this.avatarService.getDefaultAvatarUrl()) {
                this.avatarUrl = avatarUrl;
                this.sessionService.setAvatarUrl(this.avatarUrl);
              }
            } else {
              console.log('❌ No avatar URL in database');
              // Nếu chưa có avatar nào, dùng default
              if (!this.avatarUrl || this.avatarUrl === this.avatarService.getDefaultAvatarUrl()) {
                this.avatarUrl = this.avatarService.getDefaultAvatarUrl();
                this.sessionService.setAvatarUrl(this.avatarUrl);
              }
            }
          },
          error: (err) => {
            console.error('❌ Failed to load user from API:', err);
            this.loadUserFromToken();
          }
        });
      } else {
        this.avatarUrl = this.avatarService.getDefaultAvatarUrl();
        this.sessionService.setAvatarUrl(this.avatarUrl);
      }
    }
  }

  private loadUserFromToken() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔐 Token payload:', payload);
          console.log('🖼️ Avatar URL in token:', payload.avatarUrl);
          console.log('🔍 All token fields:', Object.keys(payload));
          this.username = payload.fullName || payload.sub || this.username;
          this.role = payload.role || this.role;

          if (payload.avatarUrl) {
            console.log('🖼️ Avatar URL from token:', payload.avatarUrl);
            const avatarUrl = this.avatarService.getValidAvatarUrl(payload.avatarUrl);
            console.log('🖼️ Final avatar URL from token:', avatarUrl);
            
            // Chỉ cập nhật nếu khác default
            if (avatarUrl !== this.avatarService.getDefaultAvatarUrl()) {
              this.avatarUrl = avatarUrl;
              this.sessionService.setAvatarUrl(this.avatarUrl);
            }
          } else {
            console.log('❌ No avatar URL in token');
          }
        } catch (error) {
          console.error('❌ Token decode error:', error);
          this.avatarUrl = this.avatarService.getDefaultAvatarUrl();
          this.sessionService.setAvatarUrl(this.avatarUrl);
        }
      }
    }
  }

  private getDefaultAvatar(): string {
    return this.avatarService.getDefaultAvatarUrl();
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    this.profileDropdownVisible = !this.profileDropdownVisible;
  }

  updateProfile() {
    this.profileDropdownVisible = false;
    this.showProfileUpdateModal = true;
  }

  closeProfileUpdateModal() {
    this.showProfileUpdateModal = false;
  }

  onProfileUpdateSuccess(updatedUser?: any) {
    this.showProfileUpdateModal = false;

    if (updatedUser?.avatarUrl) {
      console.log('🔄 Profile updated with new avatar:', updatedUser.avatarUrl);
      const avatarUrl = this.avatarService.getValidAvatarUrl(updatedUser.avatarUrl);
      console.log('🔄 Processed new avatar URL:', avatarUrl);
      this.avatarUrl = avatarUrl;
      this.sessionService.setAvatarUrl(this.avatarUrl);
    }

    if (updatedUser) {
      this.username = updatedUser.fullName || updatedUser.username || this.username;
    }

    this.profileUpdate.emit();
  }

  onLogout() {
    this.profileDropdownVisible = false;
    this.logout.emit();
  }

  closeDropdown() {
    this.profileDropdownVisible = false;
  }

  getDisplayAvatar(): string {
    const storedAvatar = this.sessionService.getAvatarUrl();
    return storedAvatar && !storedAvatar.includes('logocmc.png')
      ? storedAvatar
      : this.avatarService.getDefaultAvatarUrl();
  }

  onAvatarError(event: any) {
    console.log('❌ Avatar failed to load, using default');
    event.target.src = this.avatarService.getDefaultAvatarUrl();
  }

}
