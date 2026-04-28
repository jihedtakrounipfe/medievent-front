import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './layout/header.component';
import { VoiceSearchComponent } from './components/voice-search/voice-search.component';
import { SpeakOnHoverDirective } from './directives/speak-on-hover.directive';
import { AutoSpeakOnHoverDirective } from './directives/auto-speak-on-hover.directive';

@NgModule({
  declarations: [
    HeaderComponent,
    VoiceSearchComponent,
    SpeakOnHoverDirective,
    AutoSpeakOnHoverDirective
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    HeaderComponent,
    VoiceSearchComponent,
    SpeakOnHoverDirective,
    AutoSpeakOnHoverDirective
  ]
})
export class CoreModule { }
