import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = '/api/categories/list'; // hoặc thay bằng 'http://localhost:8080/categories/list' nếu không dùng proxy

  constructor(private http: HttpClient) {}

  getCategories(name?: string, description?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (name) params = params.set('name', name);
    if (description) params = params.set('description', description);

    return this.http.get<Category[]>(this.apiUrl, { params });
  }
}
