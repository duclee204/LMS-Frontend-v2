import { Component, Input, Output, EventEmitter, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
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

  // Avatar mặc định từ Backend
  private readonly DEFAULT_AVATAR = 'http://localhost:8080/images/avatars/default.png';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Nếu avatarUrl không được truyền vào hoặc rỗng, sử dụng avatar mặc định
    if (!this.avatarUrl || this.avatarUrl.trim() === '') {
      this.avatarUrl = this.DEFAULT_AVATAR;
    } else if (!this.avatarUrl.startsWith('http')) {
      // Nếu là relative path từ backend, thêm base URL
      this.avatarUrl = 'http://localhost:8080' + this.avatarUrl;
    }
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    this.profileDropdownVisible = !this.profileDropdownVisible;
  }

  updateProfile() {
    this.profileDropdownVisible = false;
    this.profileUpdate.emit();
  }

  onLogout() {
    this.profileDropdownVisible = false;
    this.logout.emit();
  }

  // Đóng dropdown khi click outside
  closeDropdown() {
    this.profileDropdownVisible = false;
  }
}