<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rpm_tiara_masters', function (Blueprint $table) {
            $table->id();

            // Identitas Utama Tiket (20 Kolom TIARA)
            $table->string('ticket_number')->unique();          // ID Tiket Utama (33.283 unik)
            $table->string('ticket_refnumber')->nullable();

            // Data Site & Hierarki Wilayah
            $table->string('siteoperator_code')->nullable()->index(); // Kode Site
            $table->string('siteoperator_name')->nullable();           // Nama Site
            $table->string('sitearea_reg')->nullable();                // Regional
            $table->string('sitearea_nop')->nullable();                // NOP
            $table->string('sitearea_to')->nullable()->index();        // TO / Area

            // Mitra & Jenis Maintenance
            $table->string('company_name')->nullable();                // Nama Vendor / Mitra
            $table->string('maintenancetype_name')->nullable();        // Jenis Pekerjaan

            // Tanggal & Waktu
            $table->date('maintenance_date')->nullable();
            $table->string('month', 50)->nullable()->index();          // Bulan
            $table->string('year', 10)->nullable()->index();           // Tahun
            $table->string('submit_time')->nullable();
            $table->string('approve_time')->nullable();

            // Status Tiket & Mapping Dashboard
            $table->string('ticket_statusname')->nullable();           // Status Asli TIARA (Closed, New, Waiting NOP, dll.)
            $table->string('dashboard_status')->nullable()->index();   // Result Mapping: APPROVED, PENDING, REJECTED, RETURNED

            // Lampiran / Detail Ekstra
            $table->text('link_evidence')->nullable();
            $table->string('kwh_meter')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rpm_tiara_masters');
    }
};