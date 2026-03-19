import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NgScrollbar } from 'ngx-scrollbar';
import gsap from 'gsap';

import {
  ContainerComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective
} from '@coreui/angular';

import { DefaultFooterComponent } from './default-footer/default-footer.component';
import { navItems } from './_nav';
import { ToastHostComponent } from '../../../shared/components/toast-host/toast-host.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  imports: [
    SidebarComponent,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    ContainerComponent,
    DefaultFooterComponent,
    ToastHostComponent,
    NgScrollbar,
    RouterOutlet,
  ]
})
export class DefaultLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  @ViewChild('pageContent', { static: true }) pageContent!: ElementRef<HTMLDivElement>;

  public navItems = [...navItems];
  public sidebarCollapsed = false;

  private routerSub?: Subscription;

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.animatePage());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  onSidebarEnter() {
    this.sidebarCollapsed = false;
  }

  onSidebarLeave() {
    this.sidebarCollapsed = true;
  }

  private animatePage(): void {
    const el = this.pageContent?.nativeElement;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out', clearProps: 'all' }
    );
  }
}
