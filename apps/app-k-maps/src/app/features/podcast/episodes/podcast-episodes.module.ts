import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppIconTabsComponent } from '../../../shared/components/icon-tabs/icon-tabs.component';

import { PodcastEpisodesPageRoutingModule } from './podcast-episodes-routing.module';
import { EpisodeCardComponent } from './episode-card.component';
import { SegmentCardComponent } from './segment-card.component';
import { StatusBadgeComponent } from './status-badge.component';
import { PodcastEpisodePage } from './podcast-episode.page';
import { PodcastEpisodesPage } from './podcast-episodes.page';
import { PodcastSegmentEditorPage } from './podcast-segment-editor.page';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, PodcastEpisodesPageRoutingModule, AppIconTabsComponent],
  declarations: [
    PodcastEpisodesPage,
    PodcastEpisodePage,
    PodcastSegmentEditorPage,
    EpisodeCardComponent,
    SegmentCardComponent,
    StatusBadgeComponent,
  ],
})
export class PodcastEpisodesPageModule {}
