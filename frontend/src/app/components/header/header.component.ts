import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineStateService } from '../../services/pipeline-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="h-16 bg-k2-bg border-b border-k2-border flex items-center justify-between px-6 select-none">
      <!-- Logotipo Oficial K2 -->
      <div class="flex items-center space-x-3">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-k2-teal to-k2-accent flex items-center justify-center shadow-k2-neon font-black text-black text-xl tracking-tighter">
            K2
          </div>
          <div>
            <div class="flex items-center space-x-1.5">
              <span class="font-extrabold tracking-wider text-lg text-white">K2</span>
              <span class="font-light text-xs text-k2-accent tracking-widest uppercase bg-k2-card px-1.5 py-0.5 rounded border border-k2-teal/40">IA SEGURIDAD</span>
            </div>
            <p class="text-[10px] text-gray-400 tracking-wider uppercase font-medium">Plataforma de Video Analítica Forense y en Vivo</p>
          </div>
        </div>
      </div>

      <!-- Selector de Modo: EN VIVO | FORENSE -->
      <div class="flex items-center bg-k2-cardDark p-1 rounded-xl border border-k2-border">
        <button 
          (click)="state.setMode('live')"
          [class]="state.activeMode() === 'live' 
            ? 'bg-gradient-to-r from-k2-teal to-k2-accent text-black font-bold shadow-k2-neon' 
            : 'text-gray-400 hover:text-white'"
          class="flex items-center space-x-2 px-5 py-1.5 rounded-lg text-xs tracking-wider uppercase transition-all duration-200">
          <span class="w-2 h-2 rounded-full" [class]="state.activeMode() === 'live' ? 'bg-black animate-ping' : 'bg-green-500'"></span>
          <span>EN VIVO</span>
        </button>

        <button 
          (click)="state.setMode('forensic')"
          [class]="state.activeMode() === 'forensic' 
            ? 'bg-gradient-to-r from-k2-teal to-k2-accent text-black font-bold shadow-k2-neon' 
            : 'text-gray-400 hover:text-white'"
          class="flex items-center space-x-2 px-5 py-1.5 rounded-lg text-xs tracking-wider uppercase transition-all duration-200">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>FORENSE</span>
        </button>
      </div>

      <!-- Indicadores de Estado del Sistema -->
      <div class="flex items-center space-x-4">
        <!-- MediaMTX RTSP Status -->
        <div class="flex items-center space-x-2 bg-k2-card/60 px-3 py-1.5 rounded-lg border border-k2-border text-xs">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="text-gray-300 font-mono">MediaMTX:</span>
          <span class="text-emerald-400 font-semibold font-mono">RTSP / WebRTC</span>
        </div>

        <!-- FPS Counter -->
        <div class="flex items-center space-x-1.5 bg-k2-card/60 px-3 py-1.5 rounded-lg border border-k2-border text-xs">
          <span class="text-gray-400 font-mono">FPS:</span>
          <span class="text-k2-accent font-bold font-mono">{{ state.systemStatus().fps | number:'1.1-1' }}</span>
        </div>

        <!-- RunPod RTX 4090 GPU Badge -->
        <div class="flex items-center space-x-2.5 bg-k2-card px-3.5 py-1.5 rounded-lg border border-k2-teal/50 shadow-sm">
          <div class="flex flex-col">
            <div class="flex items-center space-x-1.5">
              <span class="text-[10px] text-gray-400 uppercase font-semibold">RunPod GPU</span>
              <span class="w-1.5 h-1.5 rounded-full bg-k2-accent"></span>
              <span class="text-xs font-bold text-white font-mono">RTX 4090 (24GB)</span>
            </div>
            <div class="flex items-center space-x-2 mt-0.5">
              <div class="w-20 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-k2-accent h-full rounded-full transition-all duration-500" [style.width.%]="state.systemStatus().gpu_usage_percent"></div>
              </div>
              <span class="text-[10px] text-k2-accent font-mono font-medium">{{ state.systemStatus().gpu_usage_percent }}% VRAM</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  constructor(public state: PipelineStateService) {}
}
