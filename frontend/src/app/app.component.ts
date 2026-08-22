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
    <div class="h-screen w-screen flex flex-col bg-black text-gray-100 overflow-hidden font-sans select-none">
      <!-- 1. Header Superior (64px) -->
      <div class="h-16 w-full flex-shrink-0 border-b border-k2-border">
        <app-header></app-header>
      </div>

      <!-- 2. Cuerpo Central: Grid Estricto de 3 Columnas (320px - Centro 1fr - 320px) -->
      <div class="flex-1 w-full grid grid-cols-[320px_1fr_320px] min-h-0 overflow-hidden">
        
        <!-- Columna Izquierda: Parametrización Activa (320px) -->
        <div class="w-[320px] h-full overflow-hidden bg-k2-card/95 border-r border-k2-border flex flex-col">
          <app-param-selector class="w-full h-full"></app-param-selector>
        </div>

        <!-- Columna Central: Visor de Video HD (Ocupa el 100% del espacio central) -->
        <div class="w-full h-full min-w-0 overflow-hidden bg-black flex flex-col">
          <app-player class="w-full h-full"></app-player>
        </div>

        <!-- Columna Derecha: Feed de Alertas en Vivo (Pegado al borde derecho 320px) -->
        <div class="w-[320px] h-full overflow-hidden bg-k2-card/95 border-l border-k2-border flex flex-col">
          <app-alert-feed class="w-full h-full"></app-alert-feed>
        </div>
      </div>

      <!-- 3. Barra Inferior: Métricas Rápidas del Turno (80px) -->
      <div class="h-20 w-full flex-shrink-0 border-t border-k2-border">
        <app-metrics-bar></app-metrics-bar>
      </div>

      <!-- Modal de Auditoría / Detalle de Evento -->
      <app-alert-modal></app-alert-modal>
    </div>
  `
})
export class AppComponent {
  title = 'K2 Seguridad y Resguardo - AI Video Analytics';
}
