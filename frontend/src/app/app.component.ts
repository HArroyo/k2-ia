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
      <app-header class="flex-shrink-0"></app-header>

      <!-- Cuerpo Central (3 Columnas: Sidebar Izquierdo + Video Player Central + Feed Alertas Derecho) -->
      <div class="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
        <!-- Sidebar Izquierdo: Selector de Parametrización Única -->
        <app-param-selector class="w-80 flex-shrink-0 h-full flex flex-col"></app-param-selector>

        <!-- Panel Central: Player de Video e Inferencia IA -->
        <app-player class="flex-1 flex flex-col min-w-0 h-full"></app-player>

        <!-- Sidebar Derecho: Feed de Alertas en Tiempo Real -->
        <app-alert-feed class="w-80 flex-shrink-0 h-full flex flex-col"></app-alert-feed>
      </div>

      <!-- Barra Inferior: Métricas Rápidas del Turno -->
      <app-metrics-bar class="flex-shrink-0"></app-metrics-bar>

      <!-- Modal de Auditoría / Detalle de Evento -->
      <app-alert-modal></app-alert-modal>
    </div>
  `
})
export class AppComponent {
  title = 'K2 Seguridad y Resguardo - AI Video Analytics';
}
