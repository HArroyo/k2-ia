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
        Schema::create('vehiculos_resguardo', function (Blueprint $table) {
            $table->id();
            $table->string('placa', 20)->unique();
            $table->enum('tipo_lista', ['whitelist', 'blacklist'])->default('whitelist');
            $table->string('propietario');
            $table->string('modelo_color')->nullable();
            $table->string('motivo_bloqueo')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('placa');
            $table->index('tipo_lista');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehiculos_resguardo');
    }
};
