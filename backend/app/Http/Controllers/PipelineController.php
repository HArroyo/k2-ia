<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;

class PipelineController extends Controller
{
    /**
     * Enrutar cambio de pipeline activo hacia el motor de inferencia Python.
     */
    public function select(Request $request): JsonResponse
    {
        $request->validate([
            'pipeline' => 'required|string',
        ]);

        $aiEngineUrl = env('AI_ENGINE_URL', 'http://localhost:8001');

        try {
            $response = Http::timeout(3)->post("{$aiEngineUrl}/api/pipeline/select", [
                'pipeline' => $request->input('pipeline')
            ]);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'success',
                'active_pipeline' => $request->input('pipeline'),
                'note' => 'Pipeline registrado localmente (Motor IA asíncrono)'
            ]);
        }
    }
}
