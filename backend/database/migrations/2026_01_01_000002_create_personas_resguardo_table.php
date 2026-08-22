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
        Schema::create('personas_resguardo', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('documento')->unique();
            $table->enum('tipo_lista', ['whitelist', 'blacklist'])->default('whitelist');
            $table->json('embedding_facial')->nullable(); // Vector de 512 dimensiones
            $table->string('foto_referencia')->nullable();
            $table->string('motivo_bloqueo')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('tipo_lista');
            $table->index('activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personas_resguardo');
    }
};
