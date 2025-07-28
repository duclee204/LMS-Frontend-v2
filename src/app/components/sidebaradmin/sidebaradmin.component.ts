import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-sidebaradmin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebaradmin.component.html',
  styleUrls: ['./sidebaradmin.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SidebaradminComponent implements OnInit {
  
  currentRoute: string = '';

  constructor(
    private router: Router,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    // Lắng nghe sự thay đổi route để cập nhật active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
      console.log('Admin Sidebar - Route changed to:', this.currentRoute);
    });

    // Set initial route
    this.currentRoute = this.router.url;
    console.log('Admin Sidebar - Initial route:', this.currentRoute);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    const isActive = this.currentRoute === route || this.currentRoute.startsWith(route + '/');
    if (route === '/admin/dashboard') {
      console.log('Admin Dashboard active check:', {
        currentRoute: this.currentRoute,
        route: route,
        isActive: isActive
      });
    }
    return isActive;
  }

  logout() {
    // SessionService sẽ xử lý việc hiển thị notification và chuyển hướng
    this.sessionService.logout();
  }
}
