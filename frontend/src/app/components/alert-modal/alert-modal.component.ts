import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineStateService } from '../../services/pipeline-state.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-alert-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (state.selectedAlert(); as alert) {
      <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
        <div class="bg-k2-card border border-k2-accent/60 rounded-2xl w-full max-w-4xl overflow-hidden shadow-k2-glow flex flex-col max-h-[90vh]">
          
          <!-- Modal Header -->
          <div class="p-4 bg-k2-cardDark border-b border-k2-border flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full" [class]="isHighPriority(alert.subtipo) ? 'bg-red-500 animate-ping' : 'bg-k2-accent'"></div>
              <div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  DETALLE DE EVENTO: {{ formatSubtipo(alert.subtipo) }}
                </h3>
                <p class="text-[11px] text-gray-400 font-mono">Módulo: {{ alert.modulo | uppercase }} • Timestamp: {{ alert.created_at }}</p>
              </div>
            </div>

            <button 
              (click)="state.selectAlertModal(null)"
              class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors">
              ✕
            </button>
          </div>

          <!-- Modal Body: Dos Columnas (Frame Completo + Bitácora DB) -->
          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
            
            <!-- Columna Izquierda: Frame Completo de Evidencia -->
            <div class="flex flex-col space-y-2">
              <span class="text-xs font-bold text-k2-accent tracking-wider uppercase">FOTOGRAMA DE EVIDENCIA (SNAPSHOT)</span>
              <div class="bg-black rounded-xl border border-gray-700 overflow-hidden relative aspect-video flex items-center justify-center shadow-inner">
                @if (alert.snapshot_path) {
                  <img [src]="getSnapshotUrl(alert.snapshot_path)" alt="Evidencia Snapshot" class="w-full h-full object-cover" />
                } @else {
                  <div class="text-center p-6 text-gray-500">
                    <p class="text-xs font-mono">Captura guardada en /storage/snapshots/</p>
                  </div>
                }

                <!-- Badge flotante de confianza -->
                <div class="absolute bottom-2 right-2 bg-black/80 backdrop-blur px-2.5 py-1 rounded border border-k2-accent text-xs font-mono text-k2-accent">
                  Confianza IA: {{ (alert.confianza * 100) | number:'1.1-1' }}%
                </div>
              </div>
            </div>

            <!-- Columna Derecha: Metadatos y Registro Persistido -->
            <div class="flex flex-col space-y-4">
              <span class="text-xs font-bold text-k2-accent tracking-wider uppercase">BITÁCORA PERSISTIDA (QUERYBUILDER)</span>

              <div class="bg-k2-cardDark p-4 rounded-xl border border-gray-700 space-y-3 font-mono text-xs">
                <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span class="text-gray-400">ID Registro:</span>
                  <span class="text-white font-bold">#{{ alert.id || 'N/A' }}</span>
                </div>

                <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span class="text-gray-400">Subtipo Alerta:</span>
                  <span class="text-k2-accent font-bold">{{ alert.subtipo }}</span>
                </div>

                <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span class="text-gray-400">Sujeto / Placa:</span>
                  <span class="text-white font-bold">{{ alert.metadata?.sujeto || alert.metadata?.placa || 'N/A' }}</span>
                </div>

                <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span class="text-gray-400">Nivel Riesgo / Acción:</span>
                  <span class="text-red-400 font-bold">{{ alert.metadata?.accion_requerida || alert.metadata?.accion || alert.metadata?.nivel_riesgo || 'Auditoría Estándar' }}</span>
                </div>

                <!-- Análisis Inteligente SecVisor v6 (VLM) -->
                @if (alert.metadata?.secvisor_descripcion) {
                  <div class="p-3 bg-gradient-to-br from-k2-darkblue to-teal-950/40 rounded-xl border border-k2-accent/40 space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] font-bold text-k2-accent flex items-center space-x-1 uppercase">
                        <span class="w-1.5 h-1.5 rounded-full bg-k2-accent animate-pulse"></span>
                        <span>ANÁLISIS CONTEXTUAL SECVISOR V6</span>
                      </span>
                      <span class="text-[9px] font-mono text-gray-400">PARTNERS VLM</span>
                    </div>
                    <p class="text-[11px] text-gray-200 font-sans leading-relaxed italic">
                      "{{ alert.metadata?.secvisor_descripcion }}"
                    </p>
                  </div>
                }

                <!-- JSON Crudo de Metadatos -->
                <div class="pt-2">
                  <span class="text-gray-400 block mb-1">Metadata Completa (JSON):</span>
                  <pre class="bg-black/60 p-2.5 rounded-lg text-[10px] text-gray-300 overflow-x-auto max-h-36">{{ alert.metadata | json }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 bg-k2-cardDark border-t border-k2-border flex items-center justify-between">
            <span class="text-[11px] text-gray-400 font-mono">Registro persistido en tabla <code class="text-k2-accent">eventos_analitica</code></span>
            <button 
              (click)="state.selectAlertModal(null)"
              class="px-5 py-2 rounded-lg bg-k2-teal hover:bg-k2-accent hover:text-black text-white text-xs font-bold font-mono transition-colors">
              CERRAR AUDITORÍA
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class AlertModalComponent {
  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  formatSubtipo(subtipo: string): string {
    const map: Record<string, string> = {
      'sin_casco': 'Infracción de Casco (EPP)',
      'sin_chaleco': 'Infracción de Chaleco',
      'sin_epp_completo': 'Falta de EPP Completo',
      'caida': 'Alerta Crítica: Caída de Operario',
      'invasion_zona': 'Invasión de Área Restringida',
      'permanencia_excedida': 'Permanencia Excedida en ROI',
      'placa_blacklist': 'Vehículo en Lista Negra (LPR)',
      'rostro_blacklist': 'Sujeto en Lista Negra (Facial)',
      'accesorio_prohibido': 'Accesorio Prohibido Detectado',
      'extraccion_atributos': 'Características Físicas'
    };
    return map[subtipo] || subtipo.replace('_', ' ');
  }

  isHighPriority(subtipo: string): boolean {
    return ['placa_blacklist', 'rostro_blacklist', 'caida', 'sin_casco', 'sin_epp_completo'].includes(subtipo);
  }

  getSnapshotUrl(path: string): string {
    if (path.startsWith('http')) return path;
    const filename = path.split('/').pop();
    return `${this.apiService.getAiUrl()}/snapshots/${filename}`;
  }
}
