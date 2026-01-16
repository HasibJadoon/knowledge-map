import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PodcastEpisodesPage } from './podcast-episodes.page';

const routes: Routes = [
  {
    path: '',
    component: PodcastEpisodesPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PodcastEpisodesPageRoutingModule {}
