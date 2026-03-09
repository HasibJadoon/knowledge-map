import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppIconTabsComponent } from '../../../shared/components/icon-tabs/icon-tabs.component';

import { PodcastEpisodesPageRoutingModule } from './podcast-episodes-routing.module';
import { EpisodeCardComponent } from './components/episode-card.component';
import { SegmentCardComponent } from './components/segment-card.component';
import { StatusBadgeComponent } from './components/status-badge.component';
import { PodcastEpisodePage } from './podcast-episode/podcast-episode.page';
import { PodcastEpisodesPage } from './podcast-episodes/podcast-episodes.page';
import { PodcastSegmentEditorPage } from './podcast-segment-editor/podcast-segment-editor.page';

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
