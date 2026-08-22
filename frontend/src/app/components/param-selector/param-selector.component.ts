import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineStateService } from '../../services/pipeline-state.service';

interface PipelineOption {
  id: string;
  name: string;
  category: 'safety' | 'security';
  icon: string;
  description: string;
  model: string;
  badgeColor: string;
}

@Component({
  selector: 'app-param-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="w-80 bg-k2-card/95 border-r border-k2-border flex flex-col h-full overflow-y-auto select-none">
      <!-- Título de Sección -->
      <div class="p-4 border-b border-k2-border/60">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold text-gray-300 tracking-wider uppercase flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-k2-accent animate-ping"></span>
            <span>PARAMETRIZACIÓN ACTIVA</span>
          </h2>
          <span class="text-[10px] font-mono bg-k2-darkblue text-k2-accent px-2 py-0.5 rounded border border-k2-teal/30">
            SINGLE-PIPELINE
          </span>
        </div>
        <p class="text-[11px] text-gray-400 mt-1">Selecciona el módulo de análisis para optimizar la GPU.</p>
      </div>

      <div class="p-3 space-y-5 flex-1">
        <!-- SECCIÓN 1: SAFETY (Seguridad Ocupacional) -->
        <div>
          <div class="flex items-center space-x-2 px-2 mb-2">
            <svg class="w-4 h-4 text-k2-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="text-xs font-bold text-k2-accent tracking-wider uppercase">MÓDULO 1: SAFETY</span>
          </div>

          <div class="space-y-1.5">
            @for (opt of safetyOptions; track opt.id) {
              <button
                (click)="state.setPipeline(opt.id)"
                [class]="state.activePipeline() === opt.id 
                  ? 'bg-k2-darkblue border-k2-accent glow-accent' 
                  : 'bg-k2-card hover:bg-k2-border/40 border-transparent text-gray-300'"
                class="w-full text-left p-3 rounded-xl border transition-all duration-200 group relative">
                
                <div class="flex items-start justify-between">
                  <div class="flex items-center space-x-2.5">
                    <div [class]="state.activePipeline() === opt.id ? 'text-k2-accent' : 'text-gray-400 group-hover:text-white'">
                      <span [innerHTML]="opt.icon"></span>
                    </div>
                    <div>
                      <h4 class="text-xs font-bold" [class]="state.activePipeline() === opt.id ? 'text-white' : 'text-gray-200'">
                        {{ opt.name }}
                      </h4>
                      <p class="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{{ opt.description }}</p>
                    </div>
                  </div>

                  @if (state.activePipeline() === opt.id) {
                    <span class="flex h-2 w-2 relative mt-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-k2-accent opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-k2-accent"></span>
                    </span>
                  }
                </div>

                <div class="mt-2 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-700/40 pt-1.5">
                  <span class="font-mono">{{ opt.model }}</span>
                  <span class="font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                        [class]="state.activePipeline() === opt.id ? 'bg-k2-teal/30 text-k2-accent border border-k2-accent/30' : 'bg-gray-800 text-gray-400'">
                    {{ state.activePipeline() === opt.id ? 'ACTIVO' : 'DISPONIBLE' }}
                  </span>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- SECCIÓN 2: SECURITY (Seguridad Patrimonial) -->
        <div>
          <div class="flex items-center space-x-2 px-2 mb-2">
            <svg class="w-4 h-4 text-k2-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span class="text-xs font-bold text-k2-accent tracking-wider uppercase">MÓDULO 2: SECURITY</span>
          </div>

          <div class="space-y-1.5">
            @for (opt of securityOptions; track opt.id) {
              <button
                (click)="state.setPipeline(opt.id)"
                [class]="state.activePipeline() === opt.id 
                  ? 'bg-k2-darkblue border-k2-accent glow-accent' 
                  : 'bg-k2-card hover:bg-k2-border/40 border-transparent text-gray-300'"
                class="w-full text-left p-3 rounded-xl border transition-all duration-200 group relative">
                
                <div class="flex items-start justify-between">
                  <div class="flex items-center space-x-2.5">
                    <div [class]="state.activePipeline() === opt.id ? 'text-k2-accent' : 'text-gray-400 group-hover:text-white'">
                      <span [innerHTML]="opt.icon"></span>
                    </div>
                    <div>
                      <h4 class="text-xs font-bold" [class]="state.activePipeline() === opt.id ? 'text-white' : 'text-gray-200'">
                        {{ opt.name }}
                      </h4>
                      <p class="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{{ opt.description }}</p>
                    </div>
                  </div>

                  @if (state.activePipeline() === opt.id) {
                    <span class="flex h-2 w-2 relative mt-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-k2-accent opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-k2-accent"></span>
                    </span>
                  }
                </div>

                <div class="mt-2 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-700/40 pt-1.5">
                  <span class="font-mono">{{ opt.model }}</span>
                  <span class="font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                        [class]="state.activePipeline() === opt.id ? 'bg-k2-teal/30 text-k2-accent border border-k2-accent/30' : 'bg-gray-800 text-gray-400'">
                    {{ state.activePipeline() === opt.id ? 'ACTIVO' : 'DISPONIBLE' }}
                  </span>
                </div>
              </button>
            }
          </div>
        </div>
      </div>
    </aside>
  `
})
export class ParamSelectorComponent {
  constructor(public state: PipelineStateService) {}

  readonly safetyOptions: PipelineOption[] = [
    {
      id: 'safety_ppe',
      name: 'Casco y Chaleco (EPP)',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>',
      description: 'Detección tercio superior/medio de indumentaria',
      model: 'YOLOv11x EPP',
      badgeColor: 'border-yellow-500 text-yellow-400'
    },
    {
      id: 'safety_roi',
      name: 'Permanencia en Área (ROI)',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>',
      description: 'Tracking ByteTrack y pointPolygonTest',
      model: 'ByteTrack + ROI Test',
      badgeColor: 'border-orange-500 text-orange-400'
    },
    {
      id: 'safety_fall',
      name: 'Estabilidad y Caídas',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
      description: 'Ángulo torso-suelo < 35° y cambio brusco Y',
      model: 'YOLOv8-Pose Articular',
      badgeColor: 'border-red-500 text-red-400'
    }
  ];

  readonly securityOptions: PipelineOption[] = [
    {
      id: 'security_lpr',
      name: 'Identificación Placas (LPR)',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>',
      description: 'YOLO Placas + Fast-Plate-OCR vs DB',
      model: 'YOLO + PaddleOCR',
      badgeColor: 'border-cyan-500 text-cyan-400'
    },
    {
      id: 'security_face',
      name: 'Reconocimiento Facial',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      description: 'ArcFace 512d & Similitud Coseno Listas',
      model: 'RetinaFace + ArcFace',
      badgeColor: 'border-purple-500 text-purple-400'
    },
    {
      id: 'security_accessories',
      name: 'Accesorios Prohibidos',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
      description: 'Detección de gorras, lentes oscuros y mascarillas',
      model: 'Head-Crop MultiLabel',
      badgeColor: 'border-pink-500 text-pink-400'
    },
    {
      id: 'security_attributes',
      name: 'Características Físicas',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>',
      description: 'Colores HSV ropa superior/inferior y complexión',
      model: 'HSV Color Segmenter',
      badgeColor: 'border-blue-500 text-blue-400'
    }
  ];
}
