import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, SidebarWrapperComponent],
  template: `
    <div class="page-layout">
      <app-sidebar-wrapper></app-sidebar-wrapper>
      <div class="content">
        <h1>Help</h1>
        <p>Tính năng trợ giúp đang được phát triển...</p>
      </div>
    </div>
  `,
  styles: [`
    .page-layout {
      display: block;
      min-height: 100vh;
      position: relative;
    }
    .content {
      margin-left: 260px; /* sidebar width */
      padding: 20px;
      background: #f5f7fa;
      min-height: 100vh;
      position: relative;
      z-index: 1;
    }
  `]
})
export class HelpComponent {
}
