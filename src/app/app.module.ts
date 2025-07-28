import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { Title } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DashboardComponent } from './pages/student and instructor/dashboard/dashboard.component';

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),
    ReactiveFormsModule,
    HttpClientModule,
    SidebarComponent,
    DashboardComponent
  ],
  providers: [Title],
  declarations: [],
  bootstrap: []
})
export class AppModule { }
// Đoạn code này là phần cấu hình module chính của ứng dụng Angular, bao gồm các thành phần cần thiết để khởi tạo ứng dụng.
// Nó định nghĩa các thành phần (components) sẽ được sử dụng trong ứng dụng, các module cần thiết và các dịch vụ (providers) nếu có.