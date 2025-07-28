import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationMessage } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div 
        *ngFor="let notification of notificationService.getNotifications()"
        class="notification"
        [class]="'notification-' + notification.type">
        
        <div class="notification-icon">
          <i [class]="getIconClass(notification.type)"></i>
        </div>
        
        <div class="notification-content">
          <h4>{{ notification.title }}</h4>
          <p>{{ notification.message }}</p>
        </div>
        
        <button 
          class="notification-close"
          (click)="notificationService.remove(notification)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      animation: slideIn 0.3s ease-out;
      position: relative;
      max-width: 100%;
    }

    .notification-success {
      background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(25, 135, 84, 0.95) 100%);
      border-left: 4px solid #28a745;
      color: white;
    }

    .notification-error {
      background: linear-gradient(135deg, rgba(220, 53, 69, 0.95) 0%, rgba(176, 42, 55, 0.95) 100%);
      border-left: 4px solid #dc3545;
      color: white;
    }

    .notification-warning {
      background: linear-gradient(135deg, rgba(255, 193, 7, 0.95) 0%, rgba(255, 143, 0, 0.95) 100%);
      border-left: 4px solid #ffc107;
      color: #212529;
    }

    .notification-info {
      background: linear-gradient(135deg, rgba(13, 110, 253, 0.95) 0%, rgba(6, 86, 196, 0.95) 100%);
      border-left: 4px solid #0d6efd;
      color: white;
    }

    .notification-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-content h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .notification-content p {
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
      opacity: 0.9;
    }

    .notification-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s ease;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-close:hover {
      opacity: 1;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 480px) {
      .notification-container {
        left: 10px;
        right: 10px;
        max-width: none;
      }
    }
  `]
})
export class NotificationComponent {
  constructor(public notificationService: NotificationService) {}

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-bell';
    }
  }
}
