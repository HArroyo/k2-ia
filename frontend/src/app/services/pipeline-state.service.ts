import { Injectable, signal, computed } from '@angular/core';
import { ApiService, AlertEvent, ShiftMetrics } from './api.service';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class PipelineStateService {
  // Signals de estado reactivo
  readonly activePipeline = signal<string>('safety_ppe');
  readonly activeMode = signal<'live' | 'forensic'>('live');
  readonly forensicSpeed = signal<number>(1.0);
  readonly alerts = signal<AlertEvent[]>([]);
  readonly selectedAlert = signal<AlertEvent | null>(null);
  
  readonly metrics = signal<ShiftMetrics>({
    total_detecciones: 184,
    infracciones_epp: 14,
    alertas_blacklist: 3,
    caidas_registradas: 2,
    invasiones_zona: 8
  });

  readonly systemStatus = signal({
    fps: 30.0,
    gpu_device: 'NVIDIA RTX 4090 (24GB VRAM)',
    gpu_usage_percent: 44,
    vram_used_mb: 4250,
    vram_total_mb: 24576,
    mediamtx_connected: true,
    source_mode: 'live'
  });

  // Computed signals
  readonly activeCategory = computed(() => 
    this.activePipeline().startsWith('safety') ? 'SAFETY' : 'SECURITY'
  );

  constructor(
    private apiService: ApiService,
    private socketService: SocketService
  ) {
    this.initRealtime();
    this.refreshMetrics();
    this.refreshEvents();
    this.refreshSystemStatus();

    // Polling ligero para estado y métricas
    setInterval(() => {
      this.refreshSystemStatus();
    }, 4000);
  }

  private initRealtime() {
    this.socketService.listenToAlerts().subscribe((alert: AlertEvent) => {
      this.addAlert(alert);
    });
  }

  setPipeline(pipeline: string) {
    this.activePipeline.set(pipeline);
    this.apiService.selectPipeline(pipeline).subscribe({
      next: (res) => console.log('[Pipeline] Cambiado exitosamente a:', pipeline),
      error: (err) => console.warn('[Pipeline] Error al cambiar en backend:', err)
    });
  }

  setMode(mode: 'live' | 'forensic') {
    this.activeMode.set(mode);
    this.apiService.selectMode(mode, this.forensicSpeed()).subscribe({
      next: (res) => console.log('[Modo] Cambiado a:', mode),
      error: (err) => console.warn('[Modo] Error al cambiar modo:', err)
    });
  }

  setForensicSpeed(speed: number) {
    this.forensicSpeed.set(speed);
    if (this.activeMode() === 'forensic') {
      this.apiService.selectMode('forensic', speed).subscribe();
    }
  }

  addAlert(alert: AlertEvent) {
    // Si viene sin fecha, asignamos la actual
    if (!alert.created_at) {
      alert.created_at = new Date().toISOString();
    }
    
    // Insertar al inicio (orden cronológico inverso)
    this.alerts.update(current => [alert, ...current.slice(0, 49)]);

    // Incrementar contadores reactivamente
    this.metrics.update(m => {
      const updated = { ...m, total_detecciones: m.total_detecciones + 1 };
      if (['sin_casco', 'sin_chaleco', 'sin_epp_completo'].includes(alert.subtipo)) {
        updated.infracciones_epp += 1;
      }
      if (['placa_blacklist', 'rostro_blacklist'].includes(alert.subtipo)) {
        updated.alertas_blacklist += 1;
      }
      if (alert.subtipo === 'caida') {
        updated.caidas_registradas += 1;
      }
      if (['invasion_zona', 'permanencia_excedida'].includes(alert.subtipo)) {
        updated.invasiones_zona += 1;
      }
      return updated;
    });
  }

  selectAlertModal(alert: AlertEvent | null) {
    this.selectedAlert.set(alert);
  }

  refreshMetrics() {
    this.apiService.getMetrics().subscribe({
      next: (res) => {
        if (res.data) {
          this.metrics.set(res.data);
        }
      },
      error: (err) => console.warn('[Metrics] Usando métricas locales en memoria')
    });
  }

  refreshEvents() {
    this.apiService.getEvents(undefined, 25).subscribe({
      next: (res) => {
        if (res.data && res.data.length > 0) {
          this.alerts.set(res.data);
        }
      },
      error: (err) => console.warn('[Events] Usando eventos locales')
    });
  }

  refreshSystemStatus() {
    this.apiService.getSystemStatus().subscribe({
      next: (res) => {
        if (res) {
          this.systemStatus.set({
            fps: res.fps || 30.0,
            gpu_device: res.gpu_device || 'NVIDIA RTX 4090 (24GB VRAM)',
            gpu_usage_percent: Math.round(res.gpu_usage_percent || 42),
            vram_used_mb: res.vram_used_mb || 4250,
            vram_total_mb: res.vram_total_mb || 24576,
            mediamtx_connected: res.mediamtx_connected ?? true,
            source_mode: res.source_mode || 'live'
          });
        }
      },
      error: () => {
        // Mantener simulación activa
        this.systemStatus.update(s => ({
          ...s,
          fps: 29.8 + (Math.random() * 0.4),
          gpu_usage_percent: 41 + Math.floor(Math.random() * 6)
        }));
      }
    });
  }
}
