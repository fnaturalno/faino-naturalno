import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { LocaleService } from '../../i18n/locale.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NavbarComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
})
export class AdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslocoService);
  protected readonly locale = inject(LocaleService);
  readonly menuOpen = signal(false);
  readonly fullName = computed(() => `${this.auth.currentUser()?.firstName ?? ''} ${this.auth.currentUser()?.lastName ?? ''}`.trim() || this.i18n.translate('admin.administrator'));
  readonly initials = computed(() => this.fullName().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase());
  readonly title = computed(() => {
    this.locale.lang();
    const url = this.router.url;
    if (url.includes('/orders')) return this.i18n.translate('admin.orders');
    if (url.includes('/categories')) return this.i18n.translate('admin.categories');
    if (url.includes('/settings')) return this.i18n.translate('admin.settings');
    if (url.includes('/news')) {
      return url.includes('/new') || url.includes('/edit')
        ? this.i18n.translate('admin.newsPost')
        : this.i18n.translate('admin.news');
    }
    return url.includes('/new') || url.includes('/edit')
      ? this.i18n.translate('admin.product')
      : this.i18n.translate('admin.products');
  });

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(this.locale.storefrontCommands('catalog')));
  }
}
