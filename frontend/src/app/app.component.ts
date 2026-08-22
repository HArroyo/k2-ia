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
  template: `
    <div class="h-screen w-screen flex flex-col bg-k2-bg text-gray-100 overflow-hidden font-sans">
      <!-- Header Superior -->
      <app-header></app-header>

      <!-- Cuerpo Central (3 Columnas Exactas: Selector + Player + AlertFeed) -->
      <div class="k2-body-container">
        <!-- Sidebar Izquierdo: Selector de Parametrización Única -->
        <app-param-selector></app-param-selector>

        <!-- Panel Central: Player de Video e Inferencia IA -->
        <app-player></app-player>

        <!-- Sidebar Derecho: Feed de Alertas en Tiempo Real -->
        <app-alert-feed></app-alert-feed>
      </div>

      <!-- Barra Inferior: Métricas Rápidas del Turno -->
      <app-metrics-bar></app-metrics-bar>

      <!-- Modal de Auditoría / Detalle de Evento -->
      <app-alert-modal></app-alert-modal>
    </div>
  `
})
export class AppComponent {
  title = 'K2 Seguridad y Resguardo - AI Video Analytics';
}
