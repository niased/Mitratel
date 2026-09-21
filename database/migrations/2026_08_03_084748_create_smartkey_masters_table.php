<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('smartkey_masters', function (Blueprint $table) {
            $table->id();

            // Identifikasi Hardware & Lokasi
            $table->string('serial_number')->nullable()->index(); // SN tunggal utama
            $table->string('lock_id')->nullable();               // Kebutuhan sync batch / auto-report
            $table->string('tower_id')->nullable();
            $table->string('site_name')->nullable();
            $table->string('kota_kab')->nullable();
            $table->text('long_lat')->nullable();

            // Kolom Kunci Pivot Chart (Filters, Columns, Rows, Values)
            $table->string('infrako')->nullable()->index();
            $table->string('status')->nullable()->index();
            $table->string('status_aktifitas')->nullable()->index();
            $table->string('ksm')->nullable()->index();
            $table->string('posisi_unit')->nullable()->index();
            $table->string('batch')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('smartkey_masters');
    }
};