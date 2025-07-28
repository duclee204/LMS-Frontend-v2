import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebaradminComponent } from '../sidebaradmin/sidebaradmin.component';

@Component({
  selector: 'app-sidebar-wrapper',
  standalone: true,
  imports: [CommonModule, SidebarComponent, SidebaradminComponent],
  template: `
    <div *ngIf="isAuthenticated">
      <app-sidebaradmin *ngIf="isAdmin"></app-sidebaradmin>
      <app-sidebar *ngIf="!isAdmin"></app-sidebar>
    </div>
    <!-- Debug info -->
    <div *ngIf="showDebug" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; font-size: 12px; z-index: 9999;">
      Auth: {{ isAuthenticated }}<br>
      Admin: {{ isAdmin }}<br>
      Role: {{ userRole }}
    </div>
  `
})
export class SidebarWrapperComponent implements OnInit {
  
  isAuthenticated = false;
  isAdmin = false;
  userRole = '';
  showDebug = false; // Turn off debug info

  constructor(
    private sessionService: SessionService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthStatus();
      
      // Subscribe to auth changes
      this.sessionService.authStatus$.subscribe((isAuth: boolean) => {
        this.isAuthenticated = isAuth;
        if (isAuth) {
          this.checkUserRole();
        } else {
          this.isAdmin = false;
          this.userRole = '';
        }
      });
    }
  }

  private checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token && this.sessionService.isTokenValid(token)) {
      this.isAuthenticated = true;
      this.checkUserRole();
    } else {
      this.isAuthenticated = false;
      this.isAdmin = false;
      this.userRole = '';
    }
  }

  private checkUserRole() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔍 JWT payload in sidebar-wrapper:', payload);
          
          this.userRole = payload.role || '';
          
          // Improved admin role detection for ROLE_admin format
          this.isAdmin = this.userRole === 'ROLE_admin' || 
                        this.userRole === 'ADMIN' || 
                        this.userRole === 'admin' || 
                        this.sessionService.isAdmin();
          
          console.log('🎯 Sidebar role detection:', { 
            originalRole: this.userRole,
            isAdmin: this.isAdmin,
            sessionServiceCheck: this.sessionService.isAdmin(),
            tokenValid: this.sessionService.isTokenValid(token)
          });
        } catch (error) {
          console.error('❌ Error parsing token in sidebar:', error);
          this.userRole = '';
          this.isAdmin = false;
        }
      }
    }
  }
}
