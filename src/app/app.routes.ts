import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { DashboardComponent } from './pages/student and instructor/dashboard/dashboard.component';
import { LearnOnlineComponent } from './pages/student and instructor/learn-online/learn-online.component';
import { VideoUploadComponent } from './pages/student and instructor/video-upload/video-upload.component';
import { CoursesComponent } from './pages/student and instructor/courses/courses.component';
import { ModuleComponent } from './pages/student and instructor/module/module.component';
import { ExamComponent } from './pages/student and instructor/exam/exam.component';
import { AddExamComponent } from './pages/student and instructor/addexam/addexam.component';
import { AddQuestionComponent } from './pages/student and instructor/addquestion/addquestion.component';
import { QuestionManagerComponent } from './pages/student and instructor/question-manager/question-manager.component';
import { TakeExamComponent } from './pages/student and instructor/take-exam/take-exam.component';
import { CategoryComponent } from './pages/admin/category/category.component';
import { CourseManagementComponent } from './pages/admin/course-management/course-management.component';
import { RegistrationStatisticsComponent } from './pages/admin/registration-statistics/registration-statistics.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { CalendarComponent } from './pages/student and instructor/calendar/calendar.component';
import { AssignmentsComponent } from './pages/student and instructor/assignments/assignments.component';
import { MessagesComponent } from './pages/student and instructor/messages/messages.component';
import { HelpComponent } from './pages/student and instructor/help/help.component';
import { SettingsComponent } from './pages/student and instructor/settings/settings.component';
import { DiscussionComponent } from './pages/student and instructor/discussion/discussion.component';
import { authGuard } from './auth.guard';
import { loginRedirectGuard } from './login-redirect.guard';
import { adminGuard } from './admin.guard';
import { EditQuizComponent } from './pages/admin/edit-quiz/edit-quiz.component';
import { ExamResultComponent } from './pages/student and instructor/exam-result/exam-result.component';
import { UserManagementComponent } from './pages/admin/user-management/user-management.component';
import { GradesComponent } from './pages/admin/grades/grades.component';
import { StudentGradesComponent } from './pages/student and instructor/student-grades/student-grades.component';

export const routes: Routes = [
  { path: '', component: LoginComponent, data: { title: 'Trang đăng nhập' }, canActivate: [loginRedirectGuard] },
  { path: 'login', component: LoginComponent, data: { title: 'Trang đăng nhập' }, canActivate: [loginRedirectGuard] },
  { path: 'signup', component: SignupComponent, data: { title: 'Đăng ký tài khoản' }, canActivate: [loginRedirectGuard] },
  { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' }, canActivate: [authGuard] },
  { path: 'courses', component: CoursesComponent, data: { title: 'Khóa học của tôi' }, canActivate: [authGuard] },
  { path: 'calendar', component: CalendarComponent, data: { title: 'Lịch học' }, canActivate: [authGuard] },
  { path: 'assignments', component: AssignmentsComponent, data: { title: 'Bài tập' }, canActivate: [authGuard] },
  { path: 'messages', component: MessagesComponent, data: { title: 'Tin nhắn' }, canActivate: [authGuard] },
  { path: 'discussion', component: DiscussionComponent, data: { title: 'Thảo luận' }, canActivate: [authGuard] },
  { path: 'help', component: HelpComponent, data: { title: 'Trợ giúp' }, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, data: { title: 'Cài đặt' }, canActivate: [authGuard] },
  { path: 'learn-online', component: LearnOnlineComponent, data: { title: 'Học trực tuyến' }, canActivate: [authGuard] },
  { path: 'module', component: ModuleComponent, data: { title: 'Quản lý Module' }, canActivate: [authGuard] },
  { path: 'exam', component: ExamComponent, data: { title: 'Quản lý Exam' }, canActivate: [authGuard] },
  { path: 'addexam', component: AddExamComponent, data: { title: 'Tạo Exam mới' }, canActivate: [authGuard] },
  { path: 'addquestion', component: AddQuestionComponent, data: { title: 'Tạo câu hỏi' }, canActivate: [authGuard] },
  { path: 'question-manager', component: QuestionManagerComponent, data: { title: 'Quản lý câu hỏi' }, canActivate: [authGuard] },
  { path: 'take-exam', component: TakeExamComponent, data: { title: 'Làm bài thi' }, canActivate: [authGuard] },
  { path: 'exam-result/:attemptId', component: ExamResultComponent, data: { title: 'Kết quả bài thi' }, canActivate: [authGuard] },
  { path: 'edit-quiz/:id', component: EditQuizComponent, data: { title: 'Chỉnh sửa bài thi' }, canActivate: [authGuard] },
  { path: 'classroom', redirectTo: '/learn-online', pathMatch: 'full' }, // Redirect cũ
  { path: 'video-upload', component: VideoUploadComponent, data: { title: 'Tải video lên' }, canActivate: [authGuard] },
  { path: 'category', component: CategoryComponent, data: { title: 'Quản lý danh mục' }, canActivate: [authGuard] },
  { path: 'course-management', component: CourseManagementComponent, data: { title: 'Quản lý khóa học' }, canActivate: [authGuard] },
    
  // Admin routes
  { path: 'admin/dashboard', component: AdminDashboardComponent, data: { title: 'Admin Dashboard' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/quiz/edit/:id', component: EditQuizComponent, data: { title: 'Chỉnh sửa bài thi' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/users', component: AdminDashboardComponent, data: { title: 'User Management' }, canActivate: [authGuard, adminGuard] }, // Temporary use AdminDashboard
  { path: 'admin/courses', component: AdminDashboardComponent, data: { title: 'Admin Course Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/exams', component: AdminDashboardComponent, data: { title: 'Exam Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/modules', component: AdminDashboardComponent, data: { title: 'Module Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/reports', component: AdminDashboardComponent, data: { title: 'Reports & Analytics' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/settings', component: AdminDashboardComponent, data: { title: 'Admin Settings' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/categories', component: CategoryComponent, data: { title: 'Admin Category Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/enrollments', component: AdminDashboardComponent, data: { title: 'Enrollment Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/system', component: AdminDashboardComponent, data: { title: 'System Settings' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/logs', component: AdminDashboardComponent, data: { title: 'System Logs' }, canActivate: [authGuard, adminGuard] },
  { path: 'admin/registration-statistics', component: RegistrationStatisticsComponent, data: { title: 'Thống kê đăng ký' }, canActivate: [authGuard, adminGuard] },
  
  // Routes for admin sidebar (without /admin prefix)
  { path: 'users', component: AdminDashboardComponent, data: { title: 'User Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'exams', component: AdminDashboardComponent, data: { title: 'Exam Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'modules', component: AdminDashboardComponent, data: { title: 'Module Management' }, canActivate: [authGuard, adminGuard] },
  { path: 'reports', component: AdminDashboardComponent, data: { title: 'Reports & Analytics' }, canActivate: [authGuard, adminGuard] },
  { path: 'registration-statistics', component: RegistrationStatisticsComponent, data: { title: 'Thống kê đăng ký' }, canActivate: [authGuard, adminGuard] },
  
  { path: 'category', redirectTo: '/category', pathMatch: 'full' },
  { path: 'course-management', redirectTo: '/course-management', pathMatch: 'full' },
  { path: 'user-management', component: UserManagementComponent, data: { title: 'Quản lý người dùng' }, canActivate: [authGuard, adminGuard] }, // ✅ Added adminGuard
  { path: 'grades', component: GradesComponent, data: { title: 'Quản lý điểm' }, canActivate: [authGuard] },
  { path: 'student-grades', component: StudentGradesComponent, data: { title: 'Điểm của tôi' }, canActivate: [authGuard] },
];