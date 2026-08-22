<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class PersonaResguardoController extends Controller
{
    /**
     * Listar personas registradas (QueryBuilder).
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('personas_resguardo');

        if ($request->has('tipo_lista') && !empty($request->input('tipo_lista'))) {
            $query->where('tipo_lista', $request->input('tipo_lista'));
        }

        if ($request->has('buscar') && !empty($request->input('buscar'))) {
            $term = '%' . $request->input('buscar') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('nombre', 'like', $term)
                  ->orWhere('documento', 'like', $term);
            });
        }

        $personas = $query->orderBy('nombre', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $personas
        ]);
    }

    /**
     * Crear registro de persona (QueryBuilder).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre' => 'required|string',
            'documento' => 'required|string',
            'tipo_lista' => 'required|in:whitelist,blacklist',
        ]);

        $id = DB::table('personas_resguardo')->insertGetId([
            'nombre' => $request->input('nombre'),
            'documento' => $request->input('documento'),
            'tipo_lista' => $request->input('tipo_lista'),
            'embedding_facial' => $request->has('embedding') ? json_encode($request->input('embedding')) : null,
            'foto_referencia' => $request->input('foto_referencia'),
            'motivo_bloqueo' => $request->input('motivo_bloqueo'),
            'activo' => $request->input('activo', true),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json([
            'status' => 'success',
            'id' => $id,
            'message' => 'Persona registrada correctamente con QueryBuilder'
        ], 201);
    }

    /**
     * Actualizar estado o lista de una persona (QueryBuilder).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $updated = DB::table('personas_resguardo')->where('id', $id)->update([
            'tipo_lista' => $request->input('tipo_lista', DB::raw('tipo_lista')),
            'motivo_bloqueo' => $request->input('motivo_bloqueo', DB::raw('motivo_bloqueo')),
            'activo' => $request->input('activo', DB::raw('activo')),
            'updated_at' => now()
        ]);

        return response()->json([
            'status' => 'success',
            'updated' => $updated
        ]);
    }
}
