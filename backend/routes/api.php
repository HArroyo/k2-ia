<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AnaliticaController;
use App\Http\Controllers\PersonaResguardoController;
use App\Http\Controllers\VehiculoResguardoController;
use App\Http\Controllers\ZonaMonitoreoController;
use App\Http\Controllers\ForensicController;
use App\Http\Controllers\PipelineController;

/*
|--------------------------------------------------------------------------
| API Routes - K2 Seguridad y Resguardo
|--------------------------------------------------------------------------
| Todas las consultas y persistencia implementadas estrictamente con QueryBuilder.
*/

Route::prefix('eventos')->group(function () {
    Route::get('/', [AnaliticaController::class, 'index']);
    Route::post('/', [AnaliticaController::class, 'store']);
    Route::get('/{id}', [AnaliticaController::class, 'show']);
});

Route::get('/metricas', [AnaliticaController::class, 'metricas']);

Route::prefix('listas')->group(function () {
    Route::get('/personas', [PersonaResguardoController::class, 'index']);
    Route::post('/personas', [PersonaResguardoController::class, 'store']);
    Route::put('/personas/{id}', [PersonaResguardoController::class, 'update']);

    Route::get('/vehiculos', [VehiculoResguardoController::class, 'index']);
    Route::get('/vehiculos/consultar/{placa}', [VehiculoResguardoController::class, 'consultarPlaca']);
    Route::post('/vehiculos', [VehiculoResguardoController::class, 'store']);
});

Route::prefix('zonas')->group(function () {
    Route::get('/', [ZonaMonitoreoController::class, 'index']);
    Route::post('/', [ZonaMonitoreoController::class, 'store']);
});

Route::post('/forensic/upload', [ForensicController::class, 'upload']);
Route::post('/pipeline/select', [PipelineController::class, 'select']);
