import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TitleService {
  constructor(private router: Router, private title: Title, private activatedRoute: ActivatedRoute) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let route = this.activatedRoute.firstChild;
        let routeTitle = '';
        while (route) {
          if (route.snapshot.data && route.snapshot.data['title']) {
            routeTitle = route.snapshot.data['title'];
          }
          route = route.firstChild;
        }
        return routeTitle;
      })
    ).subscribe((title: string) => {
      if (title) {
        this.title.setTitle(title);
      }
    });
  }
}
