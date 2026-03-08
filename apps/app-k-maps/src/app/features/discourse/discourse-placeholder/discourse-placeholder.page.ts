import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-discourse-placeholder',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  templateUrl: './discourse-placeholder.page.html',
})
export class DiscoursePlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] ?? 'Discourse';
  subtitle = this.route.snapshot.data['subtitle'] ?? 'Coming soon.';
}
