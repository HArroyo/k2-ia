import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PipelineStateService } from '../../services/pipeline-state.service';
import { ApiService } from '../../services/api.service';

interface IncidentMarker {
  timeSeconds: number;
  label: string;
  type: 'danger' | 'warning' | 'info';
  percentage: number;
}

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="flex-1 bg-k2-bg p-4 flex flex-col justify-between overflow-hidden relative select-none">
      
      <!-- Visor de Video Central -->
      <div class="flex-1 bg-black rounded-2xl border border-k2-border overflow-hidden relative flex items-center justify-center group shadow-2xl">
        
        <!-- Video Stream MJPEG de Motor IA / Fallback -->
        <img 
          #streamImg
          [src]="streamUrl"
          (error)="handleStreamError()"
          (load)="handleStreamLoad()"
          alt="K2 AI Video Stream" 
          class="w-full h-full object-contain pointer-events-none" />

        <!-- Overlay HUD Scanline -->
        <div class="absolute inset-0 hud-scanline pointer-events-none"></div>

        <!-- HUD Superior Izquierdo: Datos de Cámara y Pipeline -->
        <div class="absolute top-4 left-4 bg-k2-bg/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-k2-border text-xs flex items-center space-x-3 pointer-events-none shadow-lg">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full" [class]="state.activeMode() === 'live' ? 'bg-red-500 animate-ping' : 'bg-k2-accent'"></span>
            <span class="font-bold tracking-wider text-white uppercase font-mono">
              {{ state.activeMode() === 'live' ? 'CAM 01: XIAOMI SMART C500' : 'ARCHIVO FORENSE: EVID_2026.MP4' }}
            </span>
          </div>
          <span class="text-gray-500">|</span>
          <span class="font-mono text-k2-accent font-semibold">1280x720 &#64; 30FPS</span>
          <span class="text-gray-500">|</span>
          <span class="text-emerald-400 font-mono text-[11px] uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            CUDA TENSORRT ON
          </span>
        </div>

        <!-- HUD Superior Derecho: Pipeline Activo Badge -->
        <div class="absolute top-4 right-4 bg-k2-card/90 backdrop-blur-md px-4 py-2 rounded-xl border border-k2-accent text-xs flex items-center space-x-2.5 pointer-events-none shadow-k2-neon">
          <div class="w-2 h-2 rounded-full bg-k2-accent"></div>
          <div class="flex flex-col text-right">
            <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{{ state.activeCategory() }} PIPELINE</span>
            <span class="text-xs font-bold text-white font-mono uppercase">{{ state.activePipeline().replace('_', ' ') }}</span>
          </div>
        </div>

        <!-- HUD Inferior: Marcas de Agua K2 -->
        <div class="absolute bottom-4 left-4 text-[10px] text-gray-400 font-mono pointer-events-none bg-black/60 px-2.5 py-1 rounded border border-gray-800">
          K2 SECURITY & DEFENSE ANALYTICS • LATENCIA: <span class="text-k2-accent font-bold">18 ms</span>
        </div>

        <!-- Overlay de Carga de Video Forense si aplica -->
        @if (state.activeMode() === 'forensic' && isUploading) {
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <div class="w-12 h-12 border-4 border-k2-teal border-t-k2-accent rounded-full animate-spin"></div>
            <p class="text-sm font-semibold text-k2-accent font-mono">Procesando e ingiriendo video para análisis forense...</p>
          </div>
        }
      </div>

      <!-- Controles y Timeline para Modo Forense -->
      @if (state.activeMode() === 'forensic') {
        <div class="mt-3 bg-k2-card/90 border border-k2-border rounded-xl p-3 flex flex-col space-y-2.5">
          <!-- Timeline con marcadores de incidentes -->
          <div class="relative w-full">
            <!-- Barra de progreso -->
            <div 
              (click)="seekTimeline($event)"
              class="w-full h-6 bg-k2-cardDark rounded-lg overflow-hidden relative cursor-pointer group/timeline border border-gray-700">
              
              <!-- Progreso de reproducción -->
              <div class="h-full bg-gradient-to-r from-k2-teal to-k2-accent/80 transition-all duration-100" [style.width.%]="forensicProgress"></div>

              <!-- Marcadores de incidentes en el timeline -->
              @for (marker of incidentMarkers; track marker.timeSeconds) {
                <div 
                  [style.left.%]="marker.percentage"
                  (click)="jumpToMarker(marker, $event)"
                  class="absolute top-0 bottom-0 w-2 group cursor-pointer -translate-x-1/2 flex items-center justify-center"
                  [title]="marker.label">
                  <div class="w-1.5 h-full rounded-full shadow-lg" [class]="marker.type === 'danger' ? 'bg-red-500 shadow-k2-red-glow' : 'bg-yellow-400'"></div>
                  
                  <!-- Tooltip flotante -->
                  <div class="hidden group-hover:block absolute -top-8 bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded border border-gray-700 whitespace-nowrap shadow-xl z-20">
                    {{ marker.label }} ({{ formatTime(marker.timeSeconds) }})
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Barra de controles de reproducción y subida -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <!-- Play / Pause -->
              <button 
                (click)="togglePlayback()"
                class="w-8 h-8 rounded-lg bg-k2-teal hover:bg-k2-accent hover:text-black text-white flex items-center justify-center transition-colors">
                @if (isPlaying) {
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                } @else {
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>

              <!-- Tiempo -->
              <div class="text-xs font-mono text-gray-300">
                <span class="text-k2-accent font-bold">{{ formatTime(currentTimeSec) }}</span> / <span>03:45</span>
              </div>

              <!-- Velocidades -->
              <div class="flex items-center space-x-1 bg-k2-cardDark px-1.5 py-0.5 rounded-lg border border-gray-700 text-xs">
                @for (spd of [1.0, 2.0, 4.0]; track spd) {
                  <button 
                    (click)="state.setForensicSpeed(spd)"
                    [class]="state.forensicSpeed() === spd ? 'bg-k2-teal text-white font-bold' : 'text-gray-400 hover:text-white'"
                    class="px-2 py-0.5 rounded text-[11px] font-mono transition-colors">
                    {{ spd }}x
                  </button>
                }
              </div>
            </div>

            <!-- Botón para subir video forense -->
            <div class="flex items-center space-x-2">
              <input 
                #fileInput 
                type="file" 
                accept="video/mp4,video/mkv,video/avi" 
                (change)="onFileSelected($event)" 
                class="hidden" />

              <button 
                (click)="fileInput.click()"
                class="flex items-center space-x-2 bg-gradient-to-r from-k2-teal to-k2-accent text-black font-bold text-xs px-4 py-1.5 rounded-lg shadow-k2-neon hover:opacity-90 transition-opacity">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>SUBIR VIDEO FORENSE</span>
              </button>
            </div>
          </div>
        </div>
      }
    </main>
  `
})
export class PlayerComponent implements OnInit, OnDestroy {
  @ViewChild('streamImg') streamImgRef!: ElementRef<HTMLImageElement>;

  streamUrl = '';
  streamActive = true;
  isPlaying = true;
  isUploading = false;
  
  currentTimeSec = 45;
  totalDurationSec = 225; // 3:45
  forensicProgress = 20;

  // Marcadores de incidentes en el scrubber forense
  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 24, percentage: 10.6, label: 'Alerta: Sin Casco (EPP)', type: 'danger' },
    { timeSeconds: 68, percentage: 30.2, label: 'Placa Sospechosa XYZ-999', type: 'danger' },
    { timeSeconds: 112, percentage: 49.7, label: 'Invasión Área ROI', type: 'warning' },
    { timeSeconds: 165, percentage: 73.3, label: 'Caída de Operario', type: 'danger' },
    { timeSeconds: 198, percentage: 88.0, label: 'Rostro Blacklist Manuel Ríos', type: 'danger' }
  ];

  private timer: any;

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.streamUrl = `${this.apiService.getAiUrl()}/stream/video`;
    this.timer = setInterval(() => {
      if (this.state.activeMode() === 'forensic' && this.isPlaying) {
        this.currentTimeSec = (this.currentTimeSec + 1 * this.state.forensicSpeed()) % this.totalDurationSec;
        this.forensicProgress = (this.currentTimeSec / this.totalDurationSec) * 100;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  handleStreamError() {
    setTimeout(() => {
      this.streamUrl = `${this.apiService.getAiUrl()}/stream/video?t=${Date.now()}`;
    }, 2000);
  }

  handleStreamLoad() {
    this.streamActive = true;
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
  }

  seekTimeline(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    this.forensicProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    this.currentTimeSec = Math.floor((this.forensicProgress / 100) * this.totalDurationSec);
  }

  jumpToMarker(marker: IncidentMarker, event: MouseEvent) {
    event.stopPropagation();
    this.currentTimeSec = marker.timeSeconds;
    this.forensicProgress = marker.percentage;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      const formData = new FormData();
      formData.append('video', file);
      formData.append('velocidad', this.state.forensicSpeed().toString());

      this.apiService.uploadForensicVideo(formData).subscribe({
        next: (res) => {
          this.isUploading = false;
          this.currentTimeSec = 0;
          this.forensicProgress = 0;
          this.state.setMode('forensic');
        },
        error: (err) => {
          this.isUploading = false;
          console.warn('[Forensic Upload] Procesando en motor local');
        }
      });
    }
  }
}
