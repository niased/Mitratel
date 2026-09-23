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

            // Identitas Tiket Utama
            $table->string('ticket_number')->unique();          // No. Tiket TIARA

            // Data Site & Wilayah
            $table->string('siteoperator_code')->index();        // Site ID
            $table->string('siteoperator_name')->nullable();    // Nama Site
            $table->string('sitearea_reg')->nullable();         // Regional
            $table->string('sitearea_to')->nullable()->index(); // TO / Area

            // Mitra & Pekerjaan
            $table->string('company_name')->nullable();         // Mitra / Vendor
            $table->string('maintenancetype_name')->nullable(); // Jenis Pekerjaan

            // Tanggal (Bulan & Tahun di-extract otomatis dari tanggal ini saat query)
            $table->date('maintenance_date')->nullable();       // Tgl Maintenance

            // Status
            $table->string('ticket_statusname')->nullable();    // Status TIARA
            $table->string('dashboard_status')->nullable()->index(); // Status Dashboard (APPROVED/PENDING/REJECTED)

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rpm_tiara_masters');
    }
};