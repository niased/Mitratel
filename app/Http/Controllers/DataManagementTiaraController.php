<?php

namespace App\Http\Controllers;

use App\Models\RpmTiaraMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataManagementTiaraController extends Controller
{
    private function nullableString(mixed $value): ?string
    {
        if (is_null($value)) {
            return null;
        }
        $trimmed = trim((string)$value);
        return $trimmed === '' ? null : $trimmed;
    }

    // ==========================================
    // STORE MULTIPLE RPM TIARA MASTER
    // (Pola disamakan 100% dengan storeRpm ANT)
    // ==========================================

    public function storeRpmTiara(Request $request)
    {
        $items = $request->has('items') 
            ? $request->input('items') 
            : ($request->has('rows') ? $request->input('rows') : [$request->all()]);

        if (empty($items) || !is_array($items)) {
            return redirect()->back()->with('error', 'Tidak ada data RPM TIARA yang dikirim.');
        }

        $insertData = [];
        $now = Carbon::now();

        foreach ($items as $item) {
            if (!is_array($item)) continue;

            $ticketNumber = $this->nullableString($item['ticket_number'] ?? $item['ticketnumber'] ?? $item['ticket_id'] ?? $item['tiara_id'] ?? $item['no_tiket'] ?? $item['norpm'] ?? null);
            $siteCode     = $this->nullableString($item['siteoperator_code'] ?? $item['siteoperatorcode'] ?? $item['site_id'] ?? $item['siteid'] ?? $item['site_code'] ?? null);
            $siteName     = $this->nullableString($item['siteoperator_name'] ?? $item['siteoperator_name'] ?? $item['site_name'] ?? $item['sitename'] ?? null);
            $areaReg      = $this->nullableString($item['sitearea_reg'] ?? $item['siteareareg'] ?? $item['regional'] ?? $item['region'] ?? null);
            $areaTo       = $this->nullableString($item['sitearea_to'] ?? $item['siteareato'] ?? $item['to_area'] ?? $item['area'] ?? $item['rtp'] ?? null);
            $companyName  = $this->nullableString($item['company_name'] ?? $item['companyname'] ?? $item['mitra'] ?? $item['vendor'] ?? null);
            $typeName     = $this->nullableString($item['maintenancetype_name'] ?? $item['maintenancetypename'] ?? $item['tipe_maintenance'] ?? $item['jenis_pekerjaan'] ?? null);
            $maintDate    = $this->nullableString($item['maintenance_date'] ?? $item['maintenancedate'] ?? $item['tanggal_maintenance'] ?? $item['tgl_done'] ?? null);
            $statusName   = $this->nullableString($item['ticket_statusname'] ?? $item['ticketstatusname'] ?? $item['status'] ?? $item['ticket_status'] ?? null);
            $dashStatus   = $this->nullableString($item['dashboard_status'] ?? $item['dashboardstatus'] ?? null);

            $hasData = !is_null($ticketNumber) || !is_null($siteCode) || !is_null($siteName) 
                    || !is_null($areaReg) || !is_null($areaTo) || !is_null($companyName) 
                    || !is_null($typeName) || !is_null($maintDate) || !is_null($statusName) || !is_null($dashStatus);

            if (!$hasData) {
                continue;
            }

            if (is_null($ticketNumber)) {
                $ticketNumber = $siteCode ?? 'TIARA-' . time() . '-' . rand(100, 999);
            }

            if (is_null($siteCode)) {
                $siteCode = $ticketNumber;
            }

            if (is_null($dashStatus)) {
                $upperStatus = strtoupper($statusName ?? '');
                if (str_contains($upperStatus, 'CLOSED') || str_contains($upperStatus, 'DONE') || $upperStatus === 'APPROVED' || $upperStatus === 'OK' || $upperStatus === 'COMPLETED') {
                    $dashStatus = 'APPROVED';
                } elseif (str_contains($upperStatus, 'REJECT')) {
                    $dashStatus = 'REJECTED';
                } elseif (str_contains($upperStatus, 'RETURN')) {
                    $dashStatus = 'RETURNED';
                } else {
                    $dashStatus = 'PENDING';
                }
            }

            $insertData[] = [
                'ticket_number'        => $ticketNumber,
                'siteoperator_code'   => $siteCode,
                'siteoperator_name'   => $siteName,
                'sitearea_reg'        => $areaReg,
                'sitearea_to'         => $areaTo,
                'company_name'        => $companyName,
                'maintenancetype_name'=> $typeName,
                'maintenance_date'    => $maintDate,
                'ticket_statusname'   => $statusName,
                'dashboard_status'    => $dashStatus,
                'created_at'          => $now,
                'updated_at'          => $now,
            ];
        }

        if (empty($insertData)) {
            return redirect()->back()->with('error', 'Gagal menyimpan. Tidak ada baris data RPM TIARA yang valid.');
        }

        try {
            DB::beginTransaction();
            RpmTiaraMaster::insert($insertData);
            DB::commit();

            $total = count($insertData);
            return redirect()->back()->with('success', "Berhasil menambahkan $total data Master RPM TIARA baru.");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Store RPM TIARA Error: " . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menyimpan data RPM TIARA: ' . $e->getMessage());
        }
    }

    public function updateRpmTiara(Request $request, int|string $id)
    {
        $validated = $request->validate([
            'ticket_number'        => 'nullable|string|max:255',
            'siteoperator_code'   => 'nullable|string|max:255',
            'siteoperator_name'   => 'nullable|string|max:255',
            'sitearea_reg'        => 'nullable|string|max:255',
            'sitearea_to'         => 'nullable|string|max:255',
            'company_name'        => 'nullable|string|max:255',
            'maintenancetype_name'=> 'nullable|string|max:255',
            'maintenance_date'    => 'nullable|string|max:255',
            'ticket_statusname'   => 'nullable|string|max:255',
            'dashboard_status'    => 'nullable|string|max:255',
        ]);

        $data = array_map([$this, 'nullableString'], $validated);

        try {
            $rpmTiara = RpmTiaraMaster::findOrFail($id);
            if (empty($data['siteoperator_code'])) {
                $data['siteoperator_code'] = $data['ticket_number'] ?? $rpmTiara->siteoperator_code ?? 'SITE-UNKNOWN';
            }
            $rpmTiara->update($data);
            return redirect()->back()->with('success', 'Data Master RPM TIARA berhasil diperbarui.');
        } catch (\Exception $e) {
            Log::error("Update RPM TIARA Error: " . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal memperbarui data RPM TIARA: ' . $e->getMessage());
        }
    }

    public function destroyRpmTiara(Request $request, int|string|null $id = null)
    {
        try {
            if ($request->has('ids') && is_array($request->input('ids'))) {
                return $this->bulkDestroyRpmTiara($request);
            }

            $targetId = $id ?? $request->input('id');
            $rpmTiara = RpmTiaraMaster::findOrFail($targetId);
            $rpmTiara->delete();

            return redirect()->back()->with('success', 'Data Master RPM TIARA berhasil dihapus.');
        } catch (\Exception $e) {
            Log::error("Delete RPM TIARA Error: " . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menghapus data RPM TIARA: ' . $e->getMessage());
        }
    }

    public function bulkDestroyRpmTiara(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'exists:rpm_tiara_masters,id',
        ]);

        try {
            $count = count($request->ids);
            RpmTiaraMaster::destroy($request->ids);
            return redirect()->back()->with('success', "$count data Master RPM TIARA berhasil dihapus.");
        } catch (\Exception $e) {
            Log::error("Bulk Delete RPM TIARA Error: " . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal menghapus data terpilih: ' . $e->getMessage());
        }
    }

    public function resetRpmTiara()
    {
        try {
            RpmTiaraMaster::truncate();
            return redirect()->back()->with('success', 'Tabel Master RPM TIARA berhasil dikosongkan!');
        } catch (\Exception $e) {
            Log::error("Reset RPM TIARA Error: " . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal mengosongkan tabel RPM TIARA: ' . $e->getMessage());
        }
    }

    public function exportRpmTiara(): StreamedResponse
    {
        $debugbarKey = 'debugbar';
        if (app()->bound($debugbarKey)) {
            app($debugbarKey)->disable();
        }

        $fileName = 'export_master_rpm_tiara_' . date('Ymd_His') . '.csv';
        $headers  = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        return response()->stream(function () {
            set_time_limit(0);
            ini_set('memory_limit', '512M');

            if (ob_get_level() > 0) {
                ob_end_clean();
            }

            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");

            fputcsv($file, [
                'No Tiket TIARA', 'Site ID', 'Nama Site',
                'Regional', 'TO / Area', 'Nama Mitra / Vendor', 'Jenis Pekerjaan',
                'Tgl Maintenance', 'Status TIARA', 'Dashboard Status'
            ], ';');

            $query = RpmTiaraMaster::query()->orderBy('id', 'asc');

            foreach ($query->cursor() as $item) {
                fputcsv($file, [
                    $item->ticket_number,
                    $item->siteoperator_code,
                    $item->siteoperator_name,
                    $item->sitearea_reg,
                    $item->sitearea_to,
                    $item->company_name,
                    $item->maintenancetype_name,
                    $item->maintenance_date,
                    $item->ticket_statusname,
                    $item->dashboard_status
                ], ';');
            }

            fclose($file);
        }, 200, $headers);
    }
}