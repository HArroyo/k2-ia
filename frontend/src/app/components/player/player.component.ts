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
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .player-root {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 12px;
      box-sizing: border-box;
      overflow: hidden;
      background: #000;
    }
    .video-container {
      flex: 1;
      min-height: 0;
      position: relative;
      background: #0b1116;
      border-radius: 12px;
      border: 1px solid #374e5e;
      overflow: hidden;
    }
    .video-container canvas {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .forensic-controls {
      flex-shrink: 0;
      margin-top: 10px;
    }
  `],
  template: `
    <div class="player-root">
      <!-- Visor de Video Central -->
      <div class="video-container">
        <canvas #videoCanvas width="1280" height="720"></canvas>

        <!-- HUD Superior Izquierdo -->
        <div class="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-xs flex items-center space-x-2 pointer-events-none z-10"
             style="position:absolute;top:12px;left:12px;">
          <span class="w-2.5 h-2.5 rounded-full" [class]="state.activeMode() === 'live' ? 'bg-red-500 animate-ping' : 'bg-emerald-400'"
                [style.background]="state.activeMode() === 'live' ? '#ef4444' : '#34d399'"
                style="width:10px;height:10px;border-radius:50%;display:inline-block;"></span>
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#fff;font-size:11px;letter-spacing:0.05em;">
            {{ state.activeMode() === 'live' ? 'CAM 01: XIAOMI SMART C500' : 'FORENSE: ' + currentDemoName }}
          </span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#00f4ed;font-weight:600;font-size:11px;">1280x720 &#64; 30FPS</span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#34d399;font-size:10px;background:rgba(6,78,59,0.6);padding:2px 6px;border-radius:4px;border:1px solid rgba(52,211,153,0.3);">
            GPU RTX 4090 ACTIVA
          </span>
        </div>

        <!-- HUD Superior Derecho: Pipeline Activo -->
        <div style="position:absolute;top:12px;right:12px;background:rgba(26,39,48,0.92);backdrop-filter:blur(8px);padding:6px 14px;border-radius:8px;border:1px solid #00f4ed;z-index:10;pointer-events:none;display:flex;align-items:center;gap:8px;">
          <span style="width:8px;height:8px;border-radius:50%;background:#00f4ed;display:inline-block;"></span>
          <div style="text-align:right;">
            <div style="font-size:9px;color:#9ca3af;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">{{ state.activeCategory() }} PIPELINE</div>
            <div style="font-size:12px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace;text-transform:uppercase;">{{ state.activePipeline().replace('_', ' ') }}</div>
          </div>
        </div>

        <!-- HUD Inferior Izquierdo -->
        <div style="position:absolute;bottom:12px;left:12px;font-size:10px;color:#9ca3af;font-family:'JetBrains Mono',monospace;background:rgba(0,0,0,0.75);padding:3px 8px;border-radius:4px;border:1px solid #374151;pointer-events:none;z-index:10;">
          K2 ANALYTICS ENGINE • LATENCIA: <span style="color:#00f4ed;font-weight:700;">14 ms</span>
        </div>

        <!-- Overlay Scanline -->
        <div class="hud-scanline" style="position:absolute;inset:0;pointer-events:none;"></div>

        <!-- Overlay de Carga -->
        @if (isUploading) {
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20;">
            <div style="width:40px;height:40px;border:4px solid #008d9b;border-top-color:#00f4ed;border-radius:50%;animation:spin 1s linear infinite;"></div>
            <p style="font-size:12px;font-weight:600;color:#00f4ed;font-family:'JetBrains Mono',monospace;">Cargando video forense...</p>
          </div>
        }
      </div>

      <!-- Controles Forenses -->
      @if (state.activeMode() === 'forensic') {
        <div class="forensic-controls" style="background:rgba(26,39,48,0.95);border:1px solid #374e5e;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
          
          <!-- Selector Rápido de Escenarios -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(55,78,94,0.5);">
            <span style="font-size:10px;font-weight:700;color:#d1d5db;text-transform:uppercase;letter-spacing:0.08em;">ESCENARIOS FORENSES:</span>
            <div style="display:flex;gap:6px;">
              @for (demo of demoScenarios; track demo.key) {
                <button 
                  (click)="loadDemoVideo(demo.key, demo.pipeline)"
                  [style.background]="currentDemoKey === demo.key ? '#00f4ed' : '#1a2730'"
                  [style.color]="currentDemoKey === demo.key ? '#000' : '#d1d5db'"
                  [style.fontWeight]="currentDemoKey === demo.key ? '700' : '400'"
                  style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;transition:all 0.15s;">
                  {{ demo.label }}
                </button>
              }
            </div>
          </div>

          <!-- Timeline -->
          <div 
            (click)="seekTimeline($event)"
            style="width:100%;height:20px;background:#111827;border-radius:6px;overflow:hidden;position:relative;cursor:pointer;border:1px solid #374151;">
            <div style="height:100%;background:linear-gradient(90deg,#008d9b,#00f4ed);transition:width 0.1s;" [style.width.%]="forensicProgress"></div>
            @for (marker of incidentMarkers; track marker.timeSeconds) {
              <div 
                [style.left.%]="marker.percentage"
                (click)="jumpToMarker(marker, $event)"
                style="position:absolute;top:0;bottom:0;width:8px;cursor:pointer;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;"
                [title]="marker.label">
                <div [style.background]="marker.type === 'danger' ? '#ef4444' : '#facc15'" style="width:5px;height:100%;border-radius:3px;"></div>
              </div>
            }
          </div>

          <!-- Controles de Reproducción + Subir Video -->
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              <button (click)="togglePlayback()" 
                style="width:28px;height:28px;border-radius:6px;background:#008d9b;color:#fff;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;">
                @if (isPlaying) {
                  <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                } @else {
                  <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>
              <span style="font-size:12px;font-family:'JetBrains Mono',monospace;">
                <span style="color:#00f4ed;font-weight:700;">{{ formatTime(currentTimeSec) }}</span>
                <span style="color:#9ca3af;"> / 03:45</span>
              </span>
              <div style="display:flex;gap:4px;background:#111827;padding:3px 6px;border-radius:6px;border:1px solid #374151;">
                @for (spd of [1.0, 2.0, 4.0]; track spd) {
                  <button 
                    (click)="state.setForensicSpeed(spd)"
                    [style.background]="state.forensicSpeed() === spd ? '#008d9b' : 'transparent'"
                    [style.color]="state.forensicSpeed() === spd ? '#fff' : '#9ca3af'"
                    [style.fontWeight]="state.forensicSpeed() === spd ? '700' : '400'"
                    style="padding:2px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:none;cursor:pointer;">
                    {{ spd }}x
                  </button>
                }
              </div>
            </div>
            <div>
              <input #fileInput type="file" accept="video/mp4,video/mkv,video/avi" (change)="onFileSelected($event)" style="display:none;" />
              <button (click)="fileInput.click()"
                style="display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#008d9b,#00f4ed);color:#000;font-weight:700;font-size:11px;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;">
                <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>SUBIR VIDEO (.MP4)</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  isPlaying = true;
  isUploading = false;
  
  currentTimeSec = 35;
  totalDurationSec = 225;
  forensicProgress = 15.5;

  currentDemoKey = 'EPP';
  currentDemoName = 'Infraccion_EPP_BahiaSur.mp4';

  readonly demoScenarios = [
    { key: 'EPP', pipeline: 'safety_ppe', label: '1. Casco/Chaleco' },
    { key: 'ROI', pipeline: 'safety_roi', label: '2. Intrusión ROI' },
    { key: 'CAIDA', pipeline: 'safety_fall', label: '3. Caída' },
    { key: 'LPR', pipeline: 'security_lpr', label: '4. Placas LPR' },
    { key: 'FACIAL', pipeline: 'security_face', label: '5. Rostro' },
  ];

  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 24, percentage: 10.6, label: 'Sin Casco EPP', type: 'danger' },
    { timeSeconds: 68, percentage: 30.2, label: 'Placa XYZ-999', type: 'danger' },
    { timeSeconds: 112, percentage: 49.7, label: 'Invasión ROI', type: 'warning' },
    { timeSeconds: 165, percentage: 73.3, label: 'Caída Operario', type: 'danger' },
    { timeSeconds: 198, percentage: 88.0, label: 'Rostro Blacklist', type: 'danger' }
  ];

  private animFrameId: any;
  private timelineTimer: any;
  private frameCount = 0;

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
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

  loadDemoVideo(key: string, pipeline: string) {
    this.currentDemoKey = key;
    this.currentDemoName = `Demo_${key}_Forensic_2026.mp4`;
    this.state.setPipeline(pipeline);
    this.currentTimeSec = 0;
    this.forensicProgress = 0;
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
      this.currentDemoName = file.name;
      const formData = new FormData();
      formData.append('video', file);
      formData.append('velocidad', this.state.forensicSpeed().toString());
      this.apiService.uploadForensicVideo(formData).subscribe({
        next: () => { this.isUploading = false; this.currentTimeSec = 0; this.forensicProgress = 0; this.state.setMode('forensic'); },
        error: () => { this.isUploading = false; this.state.setMode('forensic'); }
      });
    }
  }

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

      // Fondo de Escena CCTV Industrial
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#10171d');
      grad.addColorStop(0.45, '#1e2b36');
      grad.addColorStop(1, '#0b1116');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid de perspectiva
      ctx.strokeStyle = 'rgba(0, 244, 237, 0.06)';
      ctx.lineWidth = 1;
      const hy = h * 0.44;
      for (let i = -6; i <= 16; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + i * 70, hy);
        ctx.lineTo(w * 0.5 + i * 250, h);
        ctx.stroke();
      }

      // Zona de Acceso
      ctx.fillStyle = 'rgba(41, 61, 74, 0.5)';
      ctx.fillRect(w * 0.35, hy * 0.25, w * 0.3, hy * 0.75);
      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.35, hy * 0.25, w * 0.3, hy * 0.75);
      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.fillStyle = '#00f4ed';
      ctx.fillText('ACCESO RESTRINGIDO - PUERTA SUR', w * 0.37, hy * 0.2);

      const t = (this.frameCount * 0.03) % (2 * Math.PI);

      // Renderizado por pipeline
      if (activePip === 'safety_ppe') {
        this.drawWorker(ctx, w * 0.28 + Math.sin(t) * 20, h * 0.36, 130, 290, true, true, 'TRAB-101 (EPP OK)');
        this.drawWorker(ctx, w * 0.64 - Math.cos(t) * 25, h * 0.38, 130, 290, Math.floor(this.frameCount / 90) % 2 === 0, false, 'TRAB-102 (INFRACCION)');
      } else if (activePip === 'safety_roi') {
        this.drawROI(ctx, w, h, t);
      } else if (activePip === 'safety_fall') {
        this.drawFall(ctx, w, h);
      } else if (activePip === 'security_lpr') {
        this.drawLPR(ctx, w, h);
      } else if (activePip === 'security_face') {
        this.drawFace(ctx, w, h);
      } else if (activePip === 'security_accessories') {
        this.drawAccessories(ctx, w, h);
      } else if (activePip === 'security_attributes') {
        this.drawAttributes(ctx, w, h, t);
      }

      // Telemetría inferior
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '13px JetBrains Mono, monospace';
      const mode = this.state.activeMode() === 'live' ? 'EN VIVO: XIAOMI C500' : `FORENSE: ${this.currentDemoName}`;
      ctx.fillText(`K2 SEGURIDAD & RESGUARDO - ${mode}`, 24, h - 24);
      ctx.fillStyle = '#00ff88';
      const ds = new Date().toISOString().replace('T', ' ').substring(0, 19);
      ctx.fillText(`REC [●] ${ds} | FPS: 30.0`, w - 380, h - 24);

      this.animFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private drawWorker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, helm: boolean, vest: boolean, tag: string) {
    const ok = helm && vest;
    ctx.strokeStyle = ok ? '#00f4ed' : '#ff3355'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = helm ? '#00e676' : '#ff3355'; ctx.strokeRect(x+10, y+6, w-20, h*0.3-10);
    ctx.fillStyle = helm ? '#00e676' : '#ff3355'; ctx.font = '10px JetBrains Mono'; ctx.fillText(helm ? 'CASCO: OK' : 'SIN CASCO', x+14, y+24);
    const vy = y + h*0.33; ctx.strokeStyle = vest ? '#00e676' : '#ff3355'; ctx.strokeRect(x+10, vy, w-20, h*0.34);
    ctx.fillStyle = vest ? '#00e676' : '#ff3355'; ctx.fillText(vest ? 'CHALECO: OK' : 'SIN CHALECO', x+14, vy+20);
    ctx.fillStyle = ok ? '#008d9b' : '#ff3355'; ctx.fillRect(x, y-20, w, 20);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono'; ctx.fillText(tag, x+4, y-6);
  }

  private drawROI(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    ctx.beginPath(); ctx.moveTo(w*0.45,h*0.40); ctx.lineTo(w*0.90,h*0.40); ctx.lineTo(w*0.85,h*0.88); ctx.lineTo(w*0.40,h*0.88); ctx.closePath();
    ctx.fillStyle = 'rgba(0,140,255,0.15)'; ctx.fill(); ctx.strokeStyle = '#00f4ed'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#00f4ed'; ctx.font = 'bold 12px JetBrains Mono'; ctx.fillText('[ZONA RESTRINGIDA - MAQUINARIA]', w*0.46, h*0.44);
    const px = w*0.58+Math.cos(t)*40, py = h*0.48;
    ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 2; ctx.strokeRect(px, py, 110, 240);
    ctx.fillStyle = '#ff3355'; ctx.fillRect(px, py-20, 160, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono'; ctx.fillText('INVASION ROI (4.2s)', px+4, py-6);
  }

  private drawFall(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const fallen = (this.frameCount % 240) > 80;
    ctx.strokeStyle = '#00f4ed'; ctx.strokeRect(w*0.22, h*0.38, 100, 240);
    ctx.fillStyle = '#008d9b'; ctx.fillRect(w*0.22, h*0.38-20, 140, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono'; ctx.fillText('OPERARIO A (ESTABLE)', w*0.22+4, h*0.38-6);
    const bx = w*0.62, by = fallen?h*0.65:h*0.38, bw = fallen?220:100, bh = fallen?90:240;
    ctx.strokeStyle = fallen?'#ff3355':'#00e676'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = fallen?'#ff3355':'#00e676'; ctx.fillRect(bx, by-20, bw, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(fallen?'CAIDA DETECTADA (18°)':'OPERARIO B (ESTABLE)', bx+4, by-6);
  }

  private drawLPR(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 2; ctx.strokeRect(w*0.30, h*0.30, w*0.44, h*0.55);
    const px = w*0.30+w*0.44*0.32, py = h*0.30+h*0.55*0.72;
    ctx.fillStyle = '#fff'; ctx.fillRect(px, py, 140, 48); ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 3; ctx.strokeRect(px, py, 140, 48);
    ctx.fillStyle = '#000'; ctx.font = 'bold 22px JetBrains Mono'; ctx.fillText('XYZ-999', px+16, py+34);
    ctx.fillStyle = '#ff3355'; ctx.fillRect(px-30, py-24, 210, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono'; ctx.fillText('PLACA BLACKLIST - ALERTA', px-24, py-10);
  }

  private drawFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#00f4ed'; ctx.lineWidth = 2; ctx.strokeRect(w*0.28, h*0.36, 140, 170);
    ctx.fillStyle = '#008d9b'; ctx.fillRect(w*0.28, h*0.36-32, 180, 28); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('Roberto Alva (92%)', w*0.28+6, h*0.36-18); ctx.fillStyle = '#00f4ed'; ctx.fillText('WHITELIST', w*0.28+6, h*0.36-6);
    ctx.strokeStyle = '#ff3355'; ctx.strokeRect(w*0.62, h*0.36, 140, 170);
    ctx.fillStyle = '#ff3355'; ctx.fillRect(w*0.62, h*0.36-32, 180, 28); ctx.fillStyle = '#fff';
    ctx.fillText("Manuel Rios (89%)", w*0.62+6, h*0.36-18); ctx.fillStyle = '#ffcccc'; ctx.fillText('BLACKLIST (CAPTURA)', w*0.62+6, h*0.36-6);
  }

  private drawAccessories(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 2; ctx.strokeRect(w*0.62, h*0.34, 150, 220);
    ctx.fillStyle = '#ff3355'; ctx.fillRect(w*0.62, h*0.34-22, 170, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px JetBrains Mono'; ctx.fillText('ACCESORIO NO AUTORIZADO', w*0.62+4, h*0.34-8);
    ctx.fillStyle = '#ff3355'; ctx.font = '11px JetBrains Mono'; ctx.fillText('[!] GORRA DETECTADA', w*0.62, h*0.34+245); ctx.fillText('[!] LENTES OSCUROS', w*0.62, h*0.34+262);
  }

  private drawAttributes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const ax = w*0.42+Math.sin(t)*20, ay = h*0.32;
    ctx.strokeStyle = '#00f4ed'; ctx.lineWidth = 2; ctx.strokeRect(ax, ay, 130, 310);
    ctx.fillStyle = 'rgba(26,39,48,0.9)'; ctx.fillRect(ax+140, ay, 200, 100); ctx.strokeStyle = '#00f4ed'; ctx.strokeRect(ax+140, ay, 200, 100);
    ctx.fillStyle = '#00f4ed'; ctx.font = 'bold 11px JetBrains Mono'; ctx.fillText('ATRIBUTOS PERSONA', ax+148, ay+20);
    ctx.fillStyle = '#fff'; ctx.font = '10px JetBrains Mono'; ctx.fillText('Prenda Sup: Azul Marino', ax+148, ay+42);
    ctx.fillText('Prenda Inf: Negro', ax+148, ay+62); ctx.fillText('Complexión: Media (1.78m)', ax+148, ay+82);
  }
}
