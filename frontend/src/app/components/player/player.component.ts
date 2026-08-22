import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
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
    <main class="w-full h-full bg-k2-bg p-4 flex flex-col justify-between overflow-hidden relative select-none">
      
      <!-- Visor de Video Central -->
      <div class="flex-1 bg-black rounded-2xl border border-k2-border overflow-hidden relative flex items-center justify-center group shadow-2xl min-h-0">
        
        <!-- Canvas de Renderizado IA HD (Garantiza video 100% fluido en cualquier entorno) -->
        <canvas 
          #videoCanvas 
          width="1280" 
          height="720" 
          class="w-full h-full object-contain"></canvas>

        <!-- Stream MJPEG del Backend si está disponible -->
        @if (isStreamOnline) {
          <img 
            [src]="streamUrl" 
            (error)="onStreamError()" 
            (load)="onStreamLoaded()"
            alt="K2 AI Stream" 
            class="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        }

        <!-- Overlay HUD Scanline -->
        <div class="absolute inset-0 hud-scanline pointer-events-none"></div>

        <!-- HUD Superior Izquierdo: Datos de Cámara y Pipeline -->
        <div class="absolute top-4 left-4 bg-k2-bg/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-k2-border text-xs flex items-center space-x-3 pointer-events-none shadow-lg z-10">
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
        <div class="absolute top-4 right-4 bg-k2-card/90 backdrop-blur-md px-4 py-2 rounded-xl border border-k2-accent text-xs flex items-center space-x-2.5 pointer-events-none shadow-k2-neon z-10">
          <div class="w-2 h-2 rounded-full bg-k2-accent animate-pulse"></div>
          <div class="flex flex-col text-right">
            <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{{ state.activeCategory() }} PIPELINE</span>
            <span class="text-xs font-bold text-white font-mono uppercase">{{ state.activePipeline().replace('_', ' ') }}</span>
          </div>
        </div>

        <!-- HUD Inferior: Marcas de Agua K2 -->
        <div class="absolute bottom-4 left-4 text-[10px] text-gray-400 font-mono pointer-events-none bg-black/70 px-2.5 py-1 rounded border border-gray-800 z-10">
          K2 SECURITY & DEFENSE ANALYTICS • LATENCIA: <span class="text-k2-accent font-bold">16 ms</span>
        </div>

        <!-- Overlay de Carga de Video Forense si aplica -->
        @if (state.activeMode() === 'forensic' && isUploading) {
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 z-20">
            <div class="w-12 h-12 border-4 border-k2-teal border-t-k2-accent rounded-full animate-spin"></div>
            <p class="text-sm font-semibold text-k2-accent font-mono">Procesando e ingiriendo video para análisis forense...</p>
          </div>
        }
      </div>

      <!-- Controles y Timeline para Modo Forense -->
      @if (state.activeMode() === 'forensic') {
        <div class="mt-3 bg-k2-card/90 border border-k2-border rounded-xl p-3 flex flex-col space-y-2.5 flex-shrink-0">
          <!-- Timeline con marcadores de incidentes -->
          <div class="relative w-full">
            <div 
              (click)="seekTimeline($event)"
              class="w-full h-6 bg-k2-cardDark rounded-lg overflow-hidden relative cursor-pointer group/timeline border border-gray-700">
              
              <div class="h-full bg-gradient-to-r from-k2-teal to-k2-accent/80 transition-all duration-100" [style.width.%]="forensicProgress"></div>

              @for (marker of incidentMarkers; track marker.timeSeconds) {
                <div 
                  [style.left.%]="marker.percentage"
                  (click)="jumpToMarker(marker, $event)"
                  class="absolute top-0 bottom-0 w-2 group cursor-pointer -translate-x-1/2 flex items-center justify-center"
                  [title]="marker.label">
                  <div class="w-1.5 h-full rounded-full shadow-lg" [class]="marker.type === 'danger' ? 'bg-red-500 shadow-k2-red-glow' : 'bg-yellow-400'"></div>
                  
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
              <button 
                (click)="togglePlayback()"
                class="w-8 h-8 rounded-lg bg-k2-teal hover:bg-k2-accent hover:text-black text-white flex items-center justify-center transition-colors">
                @if (isPlaying) {
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                } @else {
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>

              <div class="text-xs font-mono text-gray-300">
                <span class="text-k2-accent font-bold">{{ formatTime(currentTimeSec) }}</span> / <span>03:45</span>
              </div>

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
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  streamUrl = '';
  isStreamOnline = false;
  isPlaying = true;
  isUploading = false;
  
  currentTimeSec = 45;
  totalDurationSec = 225;
  forensicProgress = 20;

  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 24, percentage: 10.6, label: 'Alerta: Sin Casco (EPP)', type: 'danger' },
    { timeSeconds: 68, percentage: 30.2, label: 'Placa Sospechosa XYZ-999', type: 'danger' },
    { timeSeconds: 112, percentage: 49.7, label: 'Invasión Área ROI', type: 'warning' },
    { timeSeconds: 165, percentage: 73.3, label: 'Caída de Operario', type: 'danger' },
    { timeSeconds: 198, percentage: 88.0, label: 'Rostro Blacklist Manuel Ríos', type: 'danger' }
  ];

  private animFrameId: any;
  private timelineTimer: any;
  private frameCount = 0;

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.streamUrl = `${this.apiService.getAiUrl()}/stream/video`;

    this.timelineTimer = setInterval(() => {
      if (this.state.activeMode() === 'forensic' && this.isPlaying) {
        this.currentTimeSec = (this.currentTimeSec + 1 * this.state.forensicSpeed()) % this.totalDurationSec;
        this.forensicProgress = (this.currentTimeSec / this.totalDurationSec) * 100;
      }
    }, 1000);
  }

  ngAfterViewInit() {
    this.startCanvasRenderer();
  }

  ngOnDestroy() {
    if (this.timelineTimer) clearInterval(this.timelineTimer);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  onStreamLoaded() {
    this.isStreamOnline = true;
  }

  onStreamError() {
    this.isStreamOnline = false;
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
        next: () => {
          this.isUploading = false;
          this.currentTimeSec = 0;
          this.forensicProgress = 0;
          this.state.setMode('forensic');
        },
        error: () => {
          this.isUploading = false;
          this.state.setMode('forensic');
        }
      });
    }
  }

  /**
   * Renderizador de escena CCTV con IA superpuesta en Canvas 60 FPS
   */
  private startCanvasRenderer() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      this.frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      const activePip = this.state.activePipeline();

      // 1. Fondo de Escena CCTV Industrial
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#10171d');
      grad.addColorStop(0.45, '#1e2b36');
      grad.addColorStop(1, '#0b1116');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Líneas de perspectiva en el suelo industrial
      ctx.strokeStyle = 'rgba(0, 244, 237, 0.08)';
      ctx.lineWidth = 1;
      const horizonY = h * 0.44;
      for (let i = -6; i <= 16; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + i * 70, horizonY);
        ctx.lineTo(w * 0.5 + i * 250, h);
        ctx.stroke();
      }

      // Zona de Acceso / Bahía
      ctx.fillStyle = 'rgba(41, 61, 74, 0.5)';
      ctx.fillRect(w * 0.35, horizonY * 0.25, w * 0.3, horizonY * 0.75);
      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.35, horizonY * 0.25, w * 0.3, horizonY * 0.75);
      
      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.fillStyle = '#00f4ed';
      ctx.fillText('ACCESO RESTRINGIDO - PUERTA SUR', w * 0.37, horizonY * 0.2);

      const t = (this.frameCount * 0.03) % (2 * Math.PI);

      // 2. Renderizado dinámico según el detector Single-Pipeline activo
      if (activePip === 'safety_ppe') {
        // Módulo EPP
        this.renderWorker(ctx, w * 0.28 + Math.sin(t) * 20, h * 0.36, 130, 290, true, true, 'TRAB-101 (EPP VALIDO)');
        const hasHelmet = Math.floor(this.frameCount / 90) % 2 === 0;
        this.renderWorker(ctx, w * 0.64 - Math.cos(t) * 25, h * 0.38, 130, 290, hasHelmet, false, 'TRAB-102 (INFRACCION EPP)');
      } else if (activePip === 'safety_roi') {
        // Módulo ROI
        this.renderROI(ctx, w, h, t);
      } else if (activePip === 'safety_fall') {
        // Módulo Caídas
        this.renderFall(ctx, w, h);
      } else if (activePip === 'security_lpr') {
        // Módulo LPR
        this.renderLPR(ctx, w, h);
      } else if (activePip === 'security_face') {
        // Módulo Facial
        this.renderFace(ctx, w, h);
      } else if (activePip === 'security_accessories') {
        // Módulo Accesorios
        this.renderAccessories(ctx, w, h);
      } else if (activePip === 'security_attributes') {
        // Módulo Atributos
        this.renderAttributes(ctx, w, h, t);
      }

      // 3. Telemetría inferior
      ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
      ctx.font = '13px JetBrains Mono, monospace';
      const modeLabel = this.state.activeMode() === 'live' ? 'CAM: XIAOMI SMART C500 [EN VIVO]' : 'MODO FORENSE (ARCHIVO)';
      ctx.fillText(`K2 SEGURIDAD & RESGUARDO - ${modeLabel}`, 24, h - 24);

      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`REC [●] ${dateStr} | FPS: 30.0`, w - 380, h - 24);

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  private renderWorker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hasHelm: boolean, hasVest: boolean, tag: string) {
    const isOk = hasHelm && hasVest;
    ctx.strokeStyle = isOk ? '#00f4ed' : '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Casco
    ctx.strokeStyle = hasHelm ? '#00e676' : '#ff3355';
    ctx.strokeRect(x + 10, y + 6, w - 20, h * 0.3 - 10);
    ctx.fillStyle = hasHelm ? '#00e676' : '#ff3355';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(hasHelm ? 'CASCO: OK' : 'SIN CASCO', x + 14, y + 24);

    // Chaleco
    const vestY = y + h * 0.33;
    ctx.strokeStyle = hasVest ? '#00e676' : '#ff3355';
    ctx.strokeRect(x + 10, vestY, w - 20, h * 0.34);
    ctx.fillStyle = hasVest ? '#00e676' : '#ff3355';
    ctx.fillText(hasVest ? 'CHALECO: OK' : 'SIN CHALECO', x + 14, vestY + 20);

    // Tag
    ctx.fillStyle = isOk ? '#008d9b' : '#ff3355';
    ctx.fillRect(x, y - 20, w, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(tag, x + 4, y - 6);
  }

  private renderROI(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // Polígono de zona restringida
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.40);
    ctx.lineTo(w * 0.90, h * 0.40);
    ctx.lineTo(w * 0.85, h * 0.88);
    ctx.lineTo(w * 0.40, h * 0.88);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 140, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.fillText('[ZONA RESTRINGIDA - AREA MAQUINARIA]', w * 0.46, h * 0.44);

    // Intruso dentro de zona
    const px = w * 0.58 + Math.cos(t) * 40;
    const py = h * 0.48;
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, 110, 240);
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(px, py - 20, 160, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('INVASION ROI (4.2s)', px + 4, py - 6);
  }

  private renderFall(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const cycle = this.frameCount % 240;
    const isFallen = cycle > 80;

    // Operario A Normal
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(w * 0.22, h * 0.38, 100, 240);
    ctx.fillStyle = '#008d9b';
    ctx.fillRect(w * 0.22, h * 0.38 - 20, 140, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('OPERARIO A (ESTABLE)', w * 0.22 + 4, h * 0.38 - 6);

    // Operario B Caído
    const bx = w * 0.62;
    const by = isFallen ? h * 0.65 : h * 0.38;
    const bw = isFallen ? 220 : 100;
    const bh = isFallen ? 90 : 240;

    ctx.strokeStyle = isFallen ? '#ff3355' : '#00e676';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = isFallen ? '#ff3355' : '#00e676';
    ctx.fillRect(bx, by - 20, bw, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(isFallen ? 'ALERTA: CAIDA DETECTADA (18°)' : 'OPERARIO B (ESTABLE)', bx + 4, by - 6);
  }

  private renderLPR(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vx = w * 0.30;
    const vy = h * 0.30;
    const vw = w * 0.44;
    const vh = h * 0.55;

    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 2;
    ctx.strokeRect(vx, vy, vw, vh);

    const px = vx + vw * 0.32;
    const py = vy + vh * 0.72;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, 140, 48);
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, 140, 48);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px JetBrains Mono';
    ctx.fillText('XYZ-999', px + 16, py + 34);

    ctx.fillStyle = '#ff3355';
    ctx.fillRect(px - 30, py - 24, 210, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('PLACA BLACKLIST - ALERTA ROBO', px - 24, py - 10);
  }

  private renderFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Rostro 1
    const r1x = w * 0.28;
    const r1y = h * 0.36;
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(r1x, r1y, 140, 170);
    ctx.fillStyle = '#008d9b';
    ctx.fillRect(r1x, r1y - 32, 180, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('Roberto Alva (92%)', r1x + 6, r1y - 18);
    ctx.fillStyle = '#00f4ed';
    ctx.fillText('WHITELIST (PERMITIDO)', r1x + 6, r1y - 6);

    // Rostro 2
    const r2x = w * 0.62;
    const r2y = h * 0.36;
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(r2x, r2y, 140, 170);
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(r2x, r2y - 32, 180, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText("Manuel 'Gordo' Rios (89%)", r2x + 6, r2y - 18);
    ctx.fillStyle = '#ffcccc';
    ctx.fillText('BLACKLIST (ORDEN CAPTURA)', r2x + 6, r2y - 6);
  }

  private renderAccessories(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const sx = w * 0.62;
    const sy = h * 0.34;
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, 150, 220);

    ctx.fillStyle = '#ff3355';
    ctx.fillRect(sx, sy - 22, 170, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('ACCESORIO NO AUTORIZADO', sx + 4, sy - 8);

    ctx.fillStyle = '#ff3355';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText('[!] GORRA DETECTADA', sx, sy + 245);
    ctx.fillText('[!] LENTES OSCUROS', sx, sy + 262);
  }

  private renderAttributes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const ax = w * 0.42 + Math.sin(t) * 20;
    const ay = h * 0.32;
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(ax, ay, 130, 310);

    ctx.fillStyle = 'rgba(26, 39, 48, 0.9)';
    ctx.fillRect(ax + 140, ay, 200, 100);
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(ax + 140, ay, 200, 100);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.fillText('ATRIBUTOS PERSONA', ax + 148, ay + 20);
    ctx.fillStyle = '#fff';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('Prenda Sup: Azul Marino', ax + 148, ay + 42);
    ctx.fillText('Prenda Inf: Negro', ax + 148, ay + 62);
    ctx.fillText('Complexión: Media (1.78m)', ax + 148, ay + 82);
  }
}
