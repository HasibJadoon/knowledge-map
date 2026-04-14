import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { ArabicTokensPageRoutingModule } from './arabic-tokens-routing.module';
import { ArabicTokensPage } from './arabic-tokens.page';

@NgModule({
  imports: [IonicModule, ArabicTokensPageRoutingModule, ArabicTokensPage],
})
export class ArabicTokensPageModule {}
