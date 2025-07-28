import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const loginRedirectGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('token');
    if (token) {
      // Đã có token, kiểm tra xem token có hợp lệ không
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp > currentTime) {
          // Token còn hợp lệ, redirect tới dashboard
          console.log('🔄 User already logged in, redirecting to dashboard');
          router.navigate(['/dashboard']);
          return false;
        } else {
          // Token hết hạn, xóa và cho phép vào login
          console.log('⏰ Token expired, clearing localStorage');
          localStorage.removeItem('token');
          return true;
        }
      } catch (error) {
        // Token không hợp lệ, xóa và cho phép vào login
        console.error('❌ Invalid token, clearing localStorage');
        localStorage.removeItem('token');
        return true;
      }
    }
    
    // Không có token, cho phép vào login
    return true;
  }
  
  // SSR - luôn cho phép
  return true;
};
