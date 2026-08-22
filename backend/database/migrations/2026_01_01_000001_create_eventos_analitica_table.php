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
        Schema::create('eventos_analitica', function (Blueprint $table) {
            $table->id();
            $table->string('modulo'); // 'safety' | 'security' | 'sistema'
            $table->string('subtipo'); // 'sin_casco', 'sin_chaleco', 'caida', 'invasion_zona', 'placa_blacklist', 'rostro_blacklist', etc.
            $table->string('snapshot_path')->nullable();
            $table->decimal('confianza', 5, 2)->default(0.00);
            $table->json('coordenadas_json')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();

            // Índices para optimizar consultas de QueryBuilder
            $table->index('modulo');
            $table->index('subtipo');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eventos_analitica');
    }
};
