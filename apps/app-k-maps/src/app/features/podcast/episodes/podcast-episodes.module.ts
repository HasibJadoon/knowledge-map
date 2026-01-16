import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { PodcastEpisodesPageRoutingModule } from './podcast-episodes-routing.module';
import { PodcastEpisodesPage } from './podcast-episodes.page';

@NgModule({
  imports: [CommonModule, IonicModule, PodcastEpisodesPageRoutingModule],
  declarations: [PodcastEpisodesPage],
})
export class PodcastEpisodesPageModule {}
