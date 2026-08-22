<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;

class ForensicController extends Controller
{
    /**
     * Cargar video para análisis forense.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'video' => 'required|file|mimes:mp4,mkv,avi,mov|max:512000', // max 500MB
            'parametro_ia' => 'nullable|string',
            'velocidad' => 'nullable|numeric'
        ]);

        $file = $request->file('video');
        $filename = 'forensic_' . time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('forensic_videos', $filename, 'public');

        // Notificar al motor IA en Python
        $aiEngineUrl = env('AI_ENGINE_URL', 'http://localhost:8001');
        
        try {
            Http::timeout(5)->post("{$aiEngineUrl}/api/mode/select", [
                'mode' => 'forensic',
                'speed' => (float)$request->input('velocidad', 1.0)
            ]);
        } catch (\Exception $e) {
            // Continuar si el motor corre de forma asíncrona
        }

        return response()->json([
            'status' => 'success',
            'filename' => $filename,
            'storage_path' => $path,
            'url' => asset("storage/{$path}"),
            'message' => 'Video forense cargado y enrutado al motor de análisis'
        ]);
    }
}
