import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslocoPipe } from '@jsverse/transloco';

import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-contacts',
  imports: [NavbarComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css',
})
export class ContactsComponent {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly phoneHref = 'tel:+380953488536';
  protected readonly mapHref = 'https://maps.google.com/maps?q=48.2067040,22.6398470';
  protected readonly mapEmbedUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://maps.google.com/maps?q=48.2067040,22.6398470&z=16&output=embed',
  );
  protected readonly days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
}
