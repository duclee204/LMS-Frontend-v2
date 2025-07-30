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
    this.loadUserFromAPI();

    const sessionAvatar = this.sessionService.getAvatarUrl();
    if (sessionAvatar) {
      this.avatarUrl = sessionAvatar;
    } else if (!this.avatarUrl || this.avatarUrl.trim() === '') {
      this.avatarUrl = this.getDefaultAvatar();
    } else {
      const processedUrl = this.avatarService.processAvatarUrl(this.avatarUrl);
      this.avatarUrl = processedUrl || this.getDefaultAvatar();
      this.sessionService.setAvatarUrl(this.avatarUrl);
    }
  }

  private loadUserFromAPI() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        this.userService.getCurrentUser().subscribe({
          next: (user) => {
            this.username = user.fullName || user.username || this.username;
            this.role = user.role || this.role;

            if (user.avatarUrl) {
              const processedUrl = this.avatarService.processAvatarUrl(user.avatarUrl);
              this.avatarUrl = processedUrl || this.getDefaultAvatar();
              this.sessionService.setAvatarUrl(this.avatarUrl);
            } else {
              this.avatarUrl = this.getDefaultAvatar();
              this.sessionService.setAvatarUrl(this.avatarUrl);
            }
          },
          error: () => {
            this.loadUserFromToken();
          }
        });
      } else {
        this.avatarUrl = this.getDefaultAvatar();
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
          this.username = payload.fullName || payload.sub || this.username;
          this.role = payload.role || this.role;

          if (payload.avatarUrl) {
            const processedUrl = this.avatarService.processAvatarUrl(payload.avatarUrl);
            this.avatarUrl = processedUrl || this.getDefaultAvatar();
            this.sessionService.setAvatarUrl(this.avatarUrl);
          } else {
            this.avatarUrl = this.getDefaultAvatar();
            this.sessionService.setAvatarUrl(this.avatarUrl);
          }
        } catch (error) {
          console.error('Token decode error:', error);
          this.avatarUrl = this.getDefaultAvatar();
          this.sessionService.setAvatarUrl(this.avatarUrl);
        }
      }
    }
  }

  private getDefaultAvatar(): string {
    return 'assets/default-avatar.png';
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
      const processedUrl = this.avatarService.processAvatarUrl(updatedUser.avatarUrl);
      this.avatarUrl = processedUrl || this.getDefaultAvatar();
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
    return storedAvatar && !storedAvatar.includes('default.png')
      ? storedAvatar
      : 'assets/default-avatar.png';
  }

  onAvatarError(event: any) {
    event.target.src = 'assets/default-avatar.png';
  }

}
