import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from './services/session.service';

export const adminGuard = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  const user = sessionService.getCurrentUser();
  
  if (user && sessionService.isAdmin()) {
    return true;
  } else {
    // Redirect to dashboard if not admin
    router.navigate(['/dashboard']);
    return false;
  }
};
