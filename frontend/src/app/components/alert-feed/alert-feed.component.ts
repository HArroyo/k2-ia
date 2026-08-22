import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineStateService } from '../../services/pipeline-state.service';
import { AlertEvent, ApiService } from '../../services/api.service';

@Component({
  selector: 'app-alert-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="w-80 bg-k2-card/95 border-l border-k2-border flex flex-col h-full overflow-hidden select-none">
      <!-- Encabezado del Feed -->
      <div class="p-4 border-b border-k2-border/60 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <h3 class="text-xs font-bold text-gray-200 uppercase tracking-wider">FEED DE ALERTAS EN VIVO</h3>
        </div>
        <span class="text-[10px] font-mono font-bold text-k2-accent bg-k2-darkblue px-2 py-0.5 rounded border border-k2-teal/30">
          {{ state.alerts().length }} EVENTOS
        </span>
      </div>

      <!-- Lista Cronológica Inversa de Alertas -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2.5">
        @if (state.alerts().length === 0) {
          <div class="h-64 flex flex-col items-center justify-center text-center p-4 text-gray-400">
            <svg class="w-10 h-10 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p class="text-xs font-semibold text-gray-300">Sin eventos recientes</p>
            <p class="text-[10px] text-gray-400 mt-1">El motor IA está monitoreando el flujo en tiempo real.</p>
          </div>
        } @else {
          @for (alert of state.alerts(); track alert.id || alert.created_at) {
            <div 
              (click)="state.selectAlertModal(alert)"
              class="bg-k2-darkblue hover:bg-k2-cardDark border rounded-xl p-2.5 transition-all duration-200 cursor-pointer group shadow-sm relative overflow-hidden"
              [class]="getCardBorderClass(alert.subtipo)">
              
              <!-- Badge de Gravedad / Tipo -->
              <div class="flex items-center justify-between mb-2">
                <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center space-x-1"
                      [class]="getBadgeClass(alert.subtipo)">
                  <span class="w-1.5 h-1.5 rounded-full" [class]="getDotClass(alert.subtipo)"></span>
                  <span>{{ formatSubtipo(alert.subtipo) }}</span>
                </span>

                <span class="text-[10px] font-mono text-gray-400">
                  {{ formatTime(alert.created_at) }}
                </span>
              </div>

              <!-- Contenido de la Tarjeta con Snapshot Thumbnail -->
              <div class="flex space-x-2.5 items-center">
                <!-- Thumbnail -->
                <div class="w-16 h-12 bg-black rounded-lg overflow-hidden border border-gray-700 relative flex-shrink-0 flex items-center justify-center">
                  @if (alert.snapshot_path) {
                    <img [src]="getSnapshotUrl(alert.snapshot_path)" alt="Snapshot" class="w-full h-full object-cover" />
                  } @else {
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                  <span class="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-k2-accent px-1">
                    {{ (alert.confianza * 100) | number:'1.0-0' }}%
                  </span>
                </div>

                <!-- Detalle Rápido -->
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-bold text-white truncate group-hover:text-k2-accent transition-colors">
                    {{ alert.metadata?.sujeto || alert.metadata?.placa || 'Detección IA' }}
                  </p>
                  <p class="text-[10px] text-gray-400 truncate mt-0.5">
                    {{ alert.metadata?.zona || alert.metadata?.carril || alert.metadata?.criterio || alert.metadata?.faltante || 'Registro validado' }}
                  </p>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </aside>
  `
})
export class AlertFeedComponent {
  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  formatSubtipo(subtipo: string): string {
    const map: Record<string, string> = {
      'sin_casco': 'Infracción Casco',
      'sin_chaleco': 'Sin Chaleco',
      'sin_epp_completo': 'Falta EPP',
      'caida': 'Alerta Caída',
      'invasion_zona': 'Invasión ROI',
      'permanencia_excedida': 'Dwell Excedido',
      'placa_blacklist': 'Placa Blacklist',
      'rostro_blacklist': 'Rostro Blacklist',
      'accesorio_prohibido': 'Prenda Restringida',
      'extraccion_atributos': 'Atributos Persona'
    };
    return map[subtipo] || subtipo.replace('_', ' ');
  }

  getBadgeClass(subtipo: string): string {
    if (['placa_blacklist', 'rostro_blacklist', 'caida', 'sin_casco', 'sin_epp_completo'].includes(subtipo)) {
      return 'bg-red-950/80 text-red-400 border border-red-500/40';
    }
    if (['invasion_zona', 'permanencia_excedida', 'accesorio_prohibido'].includes(subtipo)) {
      return 'bg-amber-950/80 text-amber-300 border border-amber-500/40';
    }
    return 'bg-teal-950/80 text-k2-accent border border-k2-accent/40';
  }

  getDotClass(subtipo: string): string {
    if (['placa_blacklist', 'rostro_blacklist', 'caida', 'sin_casco', 'sin_epp_completo'].includes(subtipo)) {
      return 'bg-red-500 animate-pulse';
    }
    if (['invasion_zona', 'permanencia_excedida', 'accesorio_prohibido'].includes(subtipo)) {
      return 'bg-yellow-400';
    }
    return 'bg-k2-accent';
  }

  getCardBorderClass(subtipo: string): string {
    if (['placa_blacklist', 'rostro_blacklist', 'caida'].includes(subtipo)) {
      return 'border-red-500/40 hover:border-red-400';
    }
    return 'border-k2-border hover:border-k2-accent/60';
  }

  formatTime(isoStr?: string): string {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toTimeString().substring(0, 8);
    } catch {
      return isoStr;
    }
  }

  getSnapshotUrl(path: string): string {
    if (path.startsWith('http')) return path;
    const filename = path.split('/').pop();
    return `${this.apiService.getAiUrl()}/snapshots/${filename}`;
  }
}
