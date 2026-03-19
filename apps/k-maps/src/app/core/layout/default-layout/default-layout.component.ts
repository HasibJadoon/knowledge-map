import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import gsap from 'gsap';

import { ContainerComponent } from '@coreui/angular';

import { DefaultFooterComponent } from './default-footer/default-footer.component';
import { ToastHostComponent } from '../../../shared/components/toast-host/toast-host.component';
import { AppWorkspaceSwitcherComponent } from '../../../shared/components/common/core-ui/app-workspace-switcher/app-workspace-switcher.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  imports: [
    ContainerComponent,
    DefaultFooterComponent,
    ToastHostComponent,
    RouterOutlet,
    AppWorkspaceSwitcherComponent,
  ]
})
export class DefaultLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  @ViewChild('pageContent', { static: true }) pageContent!: ElementRef<HTMLDivElement>;

  private routerSub?: Subscription;

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.animatePage());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
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
