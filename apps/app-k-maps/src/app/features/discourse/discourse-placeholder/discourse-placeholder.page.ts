import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-discourse-placeholder',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './discourse-placeholder.page.html',
  styleUrls: ['./discourse-placeholder.page.scss'],
})
export class DiscoursePlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] ?? 'Discourse';
  subtitle = this.route.snapshot.data['subtitle'] ?? 'Coming soon.';
}
