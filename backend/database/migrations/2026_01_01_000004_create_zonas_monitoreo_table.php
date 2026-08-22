<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('zonas_monitoreo', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('codigo')->unique();
            $table->json('poligono_roi'); // Array de puntos [[x1, y1], [x2, y2], ...]
            $table->string('regla_activa'); // 'prohibido_ingreso', 'permanencia_maxima', etc.
            $table->integer('tiempo_maximo_segundos')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zonas_monitoreo');
    }
};
