import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PodcastEpisodePage } from './podcast-episode/podcast-episode.page';
import { PodcastEpisodesPage } from './podcast-episodes/podcast-episodes.page';
import { PodcastSegmentEditorPage } from './podcast-segment-editor/podcast-segment-editor.page';

const routes: Routes = [
  {
    path: '',
    component: PodcastEpisodesPage,
  },
  {
    path: ':episodeId/segments/:segmentId',
    component: PodcastSegmentEditorPage,
  },
  {
    path: ':id',
    component: PodcastEpisodePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PodcastEpisodesPageRoutingModule {}
