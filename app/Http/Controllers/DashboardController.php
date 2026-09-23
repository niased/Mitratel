<?php

namespace App\Http\Controllers;

use App\Models\RpmMaster;
use App\Models\SmartkeyMaster;
use App\Models\CombatMaster;
use App\Models\CombatTrip;
use App\Models\User;
use App\Http\Controllers\DashboardTiaraController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private function parseFilterValue(mixed $input, string $default = 'ALL'): string
    {
        if (is_null($input)) {
            return $default;
        }

        if (is_array($input)) {
            $val = $input['value'] ?? $input['id'] ?? reset($input);
            return !empty($val) ? (string) $val : $default;
        }

        return (string) $input;
    }

    private function parseArrayFilter(mixed $input): array
    {
        if (empty($input)) {
            return [];
        }

        $array = is_array($input) ? $input : [$input];
        $flat = [];

        foreach ($array as $item) {
            if (is_array($item)) {
                $val = $item['value'] ?? $item['id'] ?? reset($item);
            } else {
                $val = $item;
            }

            if (!is_null($val) && $val !== '' && strtoupper((string)$val) !== 'ALL') {
                $flat[] = (string) $val;
            }
        }

        return array_values(array_unique($flat));
    }

    // ==========================================
    // 🟢 1. HALAMAN BERANDA / HOME UTAMA (/home)
    // ==========================================
    public function index(Request $request): Response
    {
        // 1A. COMBAT: MODE DASHBOARD (Menggunakan kolom status_combat)
        $totalCombat  = CombatMaster::query()->count('*');
        $rusakCombat  = CombatMaster::query()->whereRaw("(LOWER(TRIM(status_combat)) LIKE '%broken%' OR LOWER(TRIM(status_combat)) LIKE '%rusak%' OR status_combat LIKE '6.%')", [], 'and')->count('*');
        $onsiteCombat = CombatMaster::query()->whereRaw("(LOWER(TRIM(status_combat)) LIKE '%onsite%' OR status_combat LIKE '2.%')", [], 'and')->count('*');
        $readyCombat  = CombatMaster::query()->whereRaw("(LOWER(TRIM(status_combat)) LIKE '%ready%' OR status_combat LIKE '5.%')", [], 'and')->count('*');

        // Fallback jika nilai status_combat di database kosong/belum terisi
        if ($readyCombat === 0 && $onsiteCombat === 0 && $rusakCombat === 0 && $totalCombat > 0) {
            $inTransitCount = CombatTrip::query()->where('status', '=', 'IN_TRANSIT')->count('*');
            $readyCombat    = max(0, $totalCombat - $inTransitCount);
            $onsiteCombat   = $inTransitCount;
        }

        // 1B. COMBAT: MODE RUTE (Status Operasional Perjalanan dari tabel combat_trips)
        $tripInTransit = CombatTrip::query()->where('status', '=', 'IN_TRANSIT')->count('*');
        $tripAssigned  = CombatTrip::query()->where('status', '=', 'ASSIGNED')->count('*');
        $tripCompleted = CombatTrip::query()->where('status', '=', 'COMPLETED')->count('*');
        $tripTotal     = CombatTrip::query()->count('*');

        $combatSummary = [
            'unit' => [
                'total'  => $totalCombat,
                'ready'  => $readyCombat,
                'rusak'  => $rusakCombat,
                'onsite' => $onsiteCombat,
            ],
            'rute' => [
                'total_trips' => $tripTotal,
                'in_transit'  => $tripInTransit,
                'assigned'    => $tripAssigned,
                'completed'   => $tripCompleted,
            ],
        ];

        // 2. MAINTENANCE (RPM & SMARTKEY)
        $statusCol    = "LOWER(TRIM(COALESCE(approve, '')))";
        $condApproved = "{$statusCol} IN ('ok', 'approved', 'approve')";
        $condReject   = "({$statusCol} IN ('reject', 'nok') OR {$statusCol} LIKE '%reject%')";
        $condReturn   = "({$statusCol} IN ('return', 'revisi') OR {$statusCol} LIKE '%return%' OR {$statusCol} LIKE '%revisi%')";
        $condPending  = "(NOT ({$condApproved}) AND NOT ({$condReject}) AND NOT ({$condReturn}))";

        $rpmSummary = RpmMaster::query()->selectRaw("
            COUNT(*) as total_site,
            SUM(CASE WHEN {$condApproved} THEN 1 ELSE 0 END) as total_approved,
            SUM(CASE WHEN {$condPending} THEN 1 ELSE 0 END) as total_pending,
            SUM(CASE WHEN {$condReject} THEN 1 ELSE 0 END) as total_reject,
            SUM(CASE WHEN {$condReturn} THEN 1 ELSE 0 END) as total_return
        ", [])->first(['*']);

        $rpmTotal    = (int) ($rpmSummary->total_site ?? 0);
        $rpmApproved = (int) ($rpmSummary->total_approved ?? 0);
        $rpmPending  = (int) ($rpmSummary->total_pending ?? 0);
        $rpmReject   = (int) ($rpmSummary->total_reject ?? 0);
        $rpmReturn   = (int) ($rpmSummary->total_return ?? 0);
        $rpmPctOk    = $rpmTotal > 0 ? round(($rpmApproved / $rpmTotal) * 100, 1) : 0;

        $skSummary = SmartkeyMaster::query()->selectRaw("
            COUNT(*) as total_unit,
            SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'locked' THEN 1 ELSE 0 END) as count_locked,
            SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'unlocked' THEN 1 ELSE 0 END) as count_unlocked,
            SUM(CASE WHEN status_aktifitas IS NULL OR TRIM(status_aktifitas) = '' OR status_aktifitas = '#N/A' THEN 1 ELSE 0 END) as count_na
        ", [])->first(['*']);

        $maintenanceSummary = [
            'rpm' => [
                'total'    => $rpmTotal,
                'approved' => $rpmApproved,
                'pending'  => $rpmPending,
                'reject'   => $rpmReject,
                'return'   => $rpmReturn,
                'pctOk'    => $rpmPctOk,
            ],
            'smartkey' => [
                'total'    => (int) ($skSummary->total_unit ?? 0),
                'locked'   => (int) ($skSummary->count_locked ?? 0),
                'unlocked' => (int) ($skSummary->count_unlocked ?? 0),
                'na'       => (int) ($skSummary->count_na ?? 0),
            ],
        ];

        // 3. DAFTAR TIM & USER
        $teamMembers = User::query()
            ->select(['id', 'name', 'email', 'role', 'created_at'])
            ->orderBy('name', 'asc')
            ->get();

        return Inertia::render('Beranda', [
            'combatSummary'      => $combatSummary,
            'maintenanceSummary' => $maintenanceSummary,
            'teamMembers'        => $teamMembers,
            'teamCount'          => $teamMembers->count(),
        ]);
    }

    // ==========================================
    // 🟠 2. HALAMAN MAINTENANCE DASHBOARD (/maintenance/dashboard)
    // ==========================================
    public function maintenance(Request $request, DashboardTiaraController $tiaraController): Response
    {
        // --- 1. AMBIL SUMMARY DATA RPM TIARA DARI CONTROLLER TERPISAH ---
        $tiaraData = $tiaraController->getSummaryData($request);

        // --- 2. LOGIKA RPM (ANT) ---
        $rpmTahun = $this->parseFilterValue($request->input('tahun'), 'ALL');
        $rpmRtp   = $this->parseFilterValue($request->input('rtp'), 'ALL');

        $rpmQuery = RpmMaster::query();

        if (!empty($rpmTahun) && strtoupper($rpmTahun) !== 'ALL') {
            $rpmQuery->where('tahun', '=', $rpmTahun);
        }
        
        if (!empty($rpmRtp) && strtoupper($rpmRtp) !== 'ALL') {
            $rpmQuery->where('rtp', '=', $rpmRtp);
        }

        $statusCol    = "LOWER(TRIM(COALESCE(approve, '')))";
        $condApproved = "{$statusCol} IN ('ok', 'approved', 'approve')";
        $condReject   = "({$statusCol} IN ('reject', 'nok') OR {$statusCol} LIKE '%reject%')";
        $condReturn   = "({$statusCol} IN ('return', 'revisi') OR {$statusCol} LIKE '%return%' OR {$statusCol} LIKE '%revisi%')";
        $condPending  = "(NOT ({$condApproved}) AND NOT ({$condReject}) AND NOT ({$condReturn}))";

        $rpmKpi = (clone $rpmQuery)
            ->selectRaw("
                COUNT(*) as total_dokumen,
                COUNT(DISTINCT site_id) as total_site_unik,
                SUM(CASE WHEN {$condApproved} THEN 1 ELSE 0 END) as total_approved,
                SUM(CASE WHEN {$condReject} THEN 1 ELSE 0 END) as total_reject,
                SUM(CASE WHEN {$condReturn} THEN 1 ELSE 0 END) as total_return,
                SUM(CASE WHEN {$condPending} THEN 1 ELSE 0 END) as total_pending
            ", [])
            ->first(['*']);

        $pivotMonthlyRaw = (clone $rpmQuery)
            ->selectRaw("
                TRIM(COALESCE(bulan, '')) as month_str,
                SUM(CASE WHEN {$condApproved} THEN 1 ELSE 0 END) as ok,
                SUM(CASE WHEN {$condReject} THEN 1 ELSE 0 END) as reject,
                SUM(CASE WHEN {$condReturn} THEN 1 ELSE 0 END) as return_val,
                SUM(CASE WHEN {$condPending} THEN 1 ELSE 0 END) as belum
            ", [])
            ->groupBy(DB::raw("TRIM(COALESCE(bulan, ''))"))
            ->get();

        $monthlyParsed = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthlyParsed[$i] = ['ok' => 0, 'belum' => 0, 'reject' => 0, 'returnVal' => 0];
        }

        foreach ($pivotMonthlyRaw as $row) {
            $str       = strtolower(trim($row->month_str));
            $okVal     = (int) ($row->ok ?? 0);
            $belumVal  = (int) ($row->belum ?? 0);
            $rejectVal = (int) ($row->reject ?? 0);
            $retVal    = (int) ($row->return_val ?? 0);

            $mNum = intval(preg_replace('/[^0-9]/', '', $str));

            if ($mNum >= 1 && $mNum <= 12) {
                $targetMonth = $mNum;
            } else {
                if (str_contains($str, 'jan')) $targetMonth = 1;
                elseif (str_contains($str, 'feb')) $targetMonth = 2;
                elseif (str_contains($str, 'mar')) $targetMonth = 3;
                elseif (str_contains($str, 'apr')) $targetMonth = 4;
                elseif (str_contains($str, 'mei') || str_contains($str, 'may')) $targetMonth = 5;
                elseif (str_contains($str, 'jun')) $targetMonth = 6;
                elseif (str_contains($str, 'jul')) $targetMonth = 7;
                elseif (str_contains($str, 'agu') || str_contains($str, 'aug')) $targetMonth = 8;
                elseif (str_contains($str, 'sep')) $targetMonth = 9;
                elseif (str_contains($str, 'okt') || str_contains($str, 'oct')) $targetMonth = 10;
                elseif (str_contains($str, 'nov')) $targetMonth = 11;
                elseif (str_contains($str, 'des') || str_contains($str, 'dec')) $targetMonth = 12;
                else $targetMonth = 12;
            }

            $monthlyParsed[$targetMonth]['ok']        += $okVal;
            $monthlyParsed[$targetMonth]['belum']     += $belumVal;
            $monthlyParsed[$targetMonth]['reject']    += $rejectVal;
            $monthlyParsed[$targetMonth]['returnVal'] += $retVal;
        }

        $monthsName     = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $fullMonthsName = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $rpmChartData = [];
        $rawCounts = ['OK' => [], 'BELUM' => [], 'REJECT' => [], 'RETURN' => []];
        $monthTotals = [];
        $monthPct = [];

        for ($m = 1; $m <= 12; $m++) {
            $pData     = $monthlyParsed[$m];
            $okVal     = $pData['ok'];
            $belumVal  = $pData['belum'];
            $rejectVal = $pData['reject'];
            $retVal    = $pData['returnVal'];

            $rawCounts['OK'][]     = $okVal;
            $rawCounts['BELUM'][]  = $belumVal;
            $rawCounts['REJECT'][] = $rejectVal;
            $rawCounts['RETURN'][] = $retVal;

            $mTotal = $okVal + $belumVal + $rejectVal + $retVal;
            $monthTotals[] = $mTotal;
            $monthPct[]    = $mTotal > 0 ? round(($okVal / $mTotal) * 100) : 0;

            $rpmChartData[] = [
                'name'      => $monthsName[$m - 1],
                'monthNum'  => $m,
                'fullMonth' => $fullMonthsName[$m - 1],
                'total'     => $mTotal,
            ];
        }

        $counts = [
            'OK'        => $rawCounts['OK'],
            'BELUM'     => $rawCounts['BELUM'],
            'REJECT'    => $rawCounts['REJECT'],
            'RETURN'    => $rawCounts['RETURN'],
            'ok'        => $rawCounts['OK'],
            'belum'     => $rawCounts['BELUM'],
            'reject'    => $rawCounts['REJECT'],
            'return'    => $rawCounts['RETURN'],
            'returnVal' => $rawCounts['RETURN'],
            'Belum'     => $rawCounts['BELUM'],
            'Reject'    => $rawCounts['REJECT'],
            'Return'    => $rawCounts['RETURN'],
        ];

        $sumOk     = array_sum($rawCounts['OK']);
        $sumBelum  = array_sum($rawCounts['BELUM']);
        $sumReject = array_sum($rawCounts['REJECT']);
        $sumReturn = array_sum($rawCounts['RETURN']);

        $rowTotals = [
            'OK'        => $sumOk,
            'BELUM'     => $sumBelum,
            'REJECT'    => $sumReject,
            'RETURN'    => $sumReturn,
            'ok'        => $sumOk,
            'belum'     => $sumBelum,
            'reject'    => $sumReject,
            'return'    => $sumReturn,
            'returnVal' => $sumReturn,
            'Belum'     => $sumBelum,
            'Reject'    => $sumReject,
            'Return'    => $sumReturn,
        ];

        $overallTotal = array_sum($monthTotals);
        $overallPct   = $overallTotal > 0 ? round(($sumOk / $overallTotal) * 100) : 0;

        $rpmMonthlyPivot = [
            'counts'       => $counts,
            'monthTotals'  => $monthTotals,
            'monthPct'     => $monthPct,
            'rowTotals'    => $rowTotals,
            'overallTotal' => $overallTotal,
            'overallPct'   => $overallPct,
        ];

        $rpmRtpPivot = (clone $rpmQuery)
            ->selectRaw("
                COALESCE(NULLIF(TRIM(rtp), ''), 'Unassigned') as rtp_name,
                SUM(CASE WHEN {$condApproved} THEN 1 ELSE 0 END) as ok,
                SUM(CASE WHEN {$condReject} THEN 1 ELSE 0 END) as reject,
                SUM(CASE WHEN {$condReturn} THEN 1 ELSE 0 END) as return_val,
                SUM(CASE WHEN {$condPending} THEN 1 ELSE 0 END) as belum,
                COUNT(*) as total
            ", [])
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(rtp), ''), 'Unassigned')"))
            ->get()
            ->map(function ($item) {
                $tot    = (int) $item->total;
                $ok     = (int) $item->ok;
                $retVal = (int) ($item->return_val ?? 0);
                return [
                    'rtp'        => $item->rtp_name,
                    'ok'         => $ok,
                    'belum'      => (int) $item->belum,
                    'reject'     => (int) $item->reject,
                    'return'     => $retVal,
                    'returnVal'  => $retVal,
                    'return_val' => $retVal,
                    'Return'     => $retVal,
                    'total'      => $tot,
                    'pct'        => $tot > 0 ? round(($ok / $tot) * 100) : 0,
                ];
            });

        // --- 3. SMARTKEY LOGIC ---
        $skInfrako = $this->parseArrayFilter($request->input('infrako'));
        $skStatus  = $this->parseArrayFilter($request->input('status'));
        $skSn      = $this->parseArrayFilter($request->input('sn'));

        $skQuery = SmartkeyMaster::query()
            ->when(!empty($skInfrako), fn ($q) => $q->whereIn('infrako', $skInfrako))
            ->when(!empty($skStatus),  fn ($q) => $q->whereIn('status', $skStatus))
            ->when(!empty($skSn),      fn ($q) => $q->whereIn('serial_number', $skSn));

        $skSummary = (clone $skQuery)->selectRaw("
            COUNT(*) as total_unit,
            SUM(CASE WHEN LOWER(TRIM(status)) = 'aktif' THEN 1 ELSE 0 END) as count_aktif,
            SUM(CASE WHEN LOWER(TRIM(status)) IN ('rusak', 'hilang', 'problem') THEN 1 ELSE 0 END) as count_problem,
            SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'locked' THEN 1 ELSE 0 END) as count_locked,
            SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'unlocked' THEN 1 ELSE 0 END) as count_unlocked,
            SUM(CASE WHEN status_aktifitas IS NULL OR TRIM(status_aktifitas) = '' OR status_aktifitas = '#N/A' THEN 1 ELSE 0 END) as count_na
        ", [])->first(['*']);

        $skChart = (clone $skQuery)
            ->selectRaw("
                COALESCE(NULLIF(TRIM(infrako), ''), 'Unassigned') as infrako,
                SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'locked' THEN 1 ELSE 0 END) as locked,
                SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'unlocked' THEN 1 ELSE 0 END) as unlocked,
                SUM(CASE WHEN status_aktifitas IS NULL OR TRIM(status_aktifitas) = '' OR status_aktifitas = '#N/A' THEN 1 ELSE 0 END) as na,
                COUNT(*) as total
            ", [])
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(infrako), ''), 'Unassigned')"))
            ->get();

        $skMapData = (clone $skQuery)
            ->select(['long_lat', 'site_name', 'tower_id', 'serial_number', 'infrako', 'status_aktifitas', 'kota_kab', 'posisi_unit', 'ksm'])
            ->whereNotNull('long_lat')
            ->where('long_lat', '!=', '')
            ->where('long_lat', 'NOT LIKE', '%#N/A%')
            ->get()
            ->map(function ($item) {
                $raw = trim($item->long_lat);
                $parts = preg_split('/[\s,;\/]+/', $raw);
                if (count($parts) < 2) return null;

                $v1 = (float) str_replace(',', '.', $parts[0]);
                $v2 = (float) str_replace(',', '.', $parts[1]);
                if ($v1 == 0 && $v2 == 0) return null;

                $lng = abs($v1) > 50 ? $v1 : $v2;
                $lat = abs($v1) > 50 ? $v2 : $v1;
                if ($lat < -90 || $lat > 90) return null;

                $rawStatus = strtoupper(trim($item->status_aktifitas ?? ''));
                $cleanStatus = in_array($rawStatus, ['LOCKED', 'UNLOCKED']) ? $rawStatus : '#N/A';

                return [
                    'latitude'         => $lat,
                    'longitude'        => $lng,
                    'lat'              => $lat,
                    'lng'              => $lng,
                    'site_name'        => $item->site_name ?? '-',
                    'tower_id'         => $item->tower_id ?? '-',
                    'serial_number'    => $item->serial_number ?? '-',
                    'infrako'          => $item->infrako ?? '-',
                    'kota_kab'         => $item->kota_kab ?? '-',
                    'posisi_unit'      => $item->posisi_unit ?? '-',
                    'ksm'              => $item->ksm ?? '-',
                    'status_aktifitas' => $cleanStatus,
                    'status'           => $cleanStatus,
                ];
            })
            ->filter()
            ->values();

        $skTableData = (clone $skQuery)
            ->selectRaw("
                COALESCE(NULLIF(TRIM(ksm), ''), 'Unassigned') as ksm_name,
                SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'locked' THEN 1 ELSE 0 END) as locked,
                SUM(CASE WHEN LOWER(TRIM(status_aktifitas)) = 'unlocked' THEN 1 ELSE 0 END) as unlocked,
                SUM(CASE WHEN status_aktifitas IS NULL OR TRIM(status_aktifitas) = '' OR status_aktifitas = '#N/A' THEN 1 ELSE 0 END) as na,
                COUNT(*) as total
            ", [])
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(ksm), ''), 'Unassigned')"))
            ->get();

        try {
            $rpmFilterOptions = Cache::remember('rpm_filter_options_v11', 3600, function () {
                return [
                    'tahun' => array_values(RpmMaster::query()->select(['tahun'])->whereNotNull('tahun')->where('tahun', '!=', '')->distinct()->pluck('tahun')->filter()->toArray()),
                    'rtp'   => array_values(RpmMaster::query()->select(['rtp'])->whereNotNull('rtp')->where('rtp', '!=', '')->distinct()->pluck('rtp')->filter()->toArray()),
                ];
            });

            $skFilterOptions = Cache::remember('sk_filter_options_v11', 3600, function () {
                return [
                    'infrako' => array_values(SmartkeyMaster::query()->select(['infrako'])->whereNotNull('infrako')->where('infrako', '!=', '')->distinct()->pluck('infrako')->filter()->toArray()),
                    'status'  => array_values(SmartkeyMaster::query()->select(['status'])->whereNotNull('status')->where('status', '!=', '')->distinct()->pluck('status')->filter()->toArray()),
                    'sn'      => array_values(SmartkeyMaster::query()->select(['serial_number'])->whereNotNull('serial_number')->where('serial_number', '!=', '')->distinct()->pluck('serial_number')->filter()->toArray()),
                ];
            });
        } catch (\Throwable $e) {
            $rpmFilterOptions = ['tahun' => [], 'rtp' => []];
            $skFilterOptions  = ['infrako' => [], 'status' => [], 'sn' => []];
        }

        return Inertia::render('Maintenance/Dashboard/Index', [
            'rpmSummary' => [
                'totalSite'       => (int) ($rpmKpi->total_dokumen ?? 0),
                'totalApproved'   => (int) ($rpmKpi->total_approved ?? 0),
                'totalPending'    => (int) ($rpmKpi->total_pending ?? 0),
                'totalReject'     => (int) ($rpmKpi->total_reject ?? 0),
                'totalReturn'     => (int) ($rpmKpi->total_return ?? 0),
                'chartData'       => $rpmChartData,
                'monthlyPivot'    => $rpmMonthlyPivot,
                'rtpPivot'        => $rpmRtpPivot,
            ],
            'tiaraSummary'    => $tiaraData['summary'] ?? [],
            'smartkeySummary' => [
                'summary'    => $skSummary,
                'chart'      => $skChart,
                'mapData'    => $skMapData,
                'tableData'  => $skTableData,
            ],
            'filterOptions' => [
                'rpm'      => $rpmFilterOptions,
                'tiara'    => $tiaraData['options'] ?? ['regional' => [], 'vendor' => []],
                'smartkey' => $skFilterOptions,
            ],
            'filters' => [
                'rpm' => [
                    'tahun' => $rpmTahun,
                    'rtp'   => $rpmRtp,
                ],
                'tiara'    => $tiaraData['filters'] ?? ['regional' => 'ALL', 'vendor' => 'ALL'],
                'smartkey' => [
                    'infrako' => $skInfrako,
                    'status'  => $skStatus,
                    'sn'      => $skSn,
                ]
            ]
        ]);
    }
}