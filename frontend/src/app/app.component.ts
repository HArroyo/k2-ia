import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { ParamSelectorComponent } from './components/param-selector/param-selector.component';
import { PlayerComponent } from './components/player/player.component';
import { AlertFeedComponent } from './components/alert-feed/alert-feed.component';
import { MetricsBarComponent } from './components/metrics-bar/metrics-bar.component';
import { AlertModalComponent } from './components/alert-modal/alert-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ParamSelectorComponent,
    PlayerComponent,
    AlertFeedComponent,
    MetricsBarComponent,
    AlertModalComponent
  ],
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    .k2-shell {
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #000;
      color: #f3f4f6;
      font-family: 'Poppins', sans-serif;
    }
    .k2-header {
      height: 64px;
      flex-shrink: 0;
      width: 100%;
    }
    .k2-body {
      display: flex;
      flex-direction: row;
      flex: 1;
      width: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .k2-sidebar-left {
      width: 280px;
      min-width: 280px;
      max-width: 280px;
      height: 100%;
      flex-shrink: 0;
      overflow: hidden;
    }
    .k2-center {
      flex: 1;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }
    .k2-sidebar-right {
      width: 320px;
      min-width: 320px;
      max-width: 320px;
      height: 100%;
      flex-shrink: 0;
      overflow: hidden;
    }
    .k2-footer {
      height: 64px;
      flex-shrink: 0;
      width: 100%;
    }
  `],
  template: `
    <div class="k2-shell">
      <div class="k2-header">
        <app-header></app-header>
      </div>
      <div class="k2-body">
        <div class="k2-sidebar-left">
          <app-param-selector></app-param-selector>
        </div>
        <div class="k2-center">
          <app-player></app-player>
        </div>
        <div class="k2-sidebar-right">
          <app-alert-feed></app-alert-feed>
        </div>
      </div>
      <div class="k2-footer">
        <app-metrics-bar></app-metrics-bar>
      </div>
      <app-alert-modal></app-alert-modal>
    </div>
  `
})
export class AppComponent {
  title = 'K2 Seguridad y Resguardo - AI Video Analytics';
}
