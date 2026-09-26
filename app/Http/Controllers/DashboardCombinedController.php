<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardCombinedController extends Controller
{
    private function parseFilterValue(mixed $input, string $default = 'ALL'): string
    {
        if (is_null($input)) return $default;
        if (is_array($input)) {
            $val = $input['value'] ?? $input['id'] ?? reset($input);
            return !empty($val) ? (string) $val : $default;
        }
        return (string) $input;
    }

    private function normalizeToName(?string $raw): string
    {
        if (empty($raw)) return 'UNASSIGNED';

        $clean = strtoupper(trim($raw));
        $clean = preg_replace('/[^A-Z0-9]/', '', $clean);

        if (empty($clean)) return 'UNASSIGNED';

        if (!str_starts_with($clean, 'TO')) {
            $clean = 'TO' . $clean;
        }

        return $clean;
    }

    private function normalizeSiteId(?string $raw): string
    {
        if (empty($raw)) return '';
        $clean = strtoupper(trim($raw));
        return preg_replace('/[^A-Z0-9]/', '', $clean);
    }

    private function parseMonthNum(?string $monthStr): ?int
    {
        if (empty($monthStr)) return null;
        $str = strtolower(trim($monthStr));
        $mNum = intval(preg_replace('/[^0-9]/', '', $str));
        if ($mNum >= 1 && $mNum <= 12) return $mNum;

        if (str_contains($str, 'jan')) return 1;
        if (str_contains($str, 'feb')) return 2;
        if (str_contains($str, 'mar')) return 3;
        if (str_contains($str, 'apr')) return 4;
        if (str_contains($str, 'mei') || str_contains($str, 'may')) return 5;
        if (str_contains($str, 'jun')) return 6;
        if (str_contains($str, 'jul')) return 7;
        if (str_contains($str, 'agu') || str_contains($str, 'aug')) return 8;
        if (str_contains($str, 'sep')) return 9;
        if (str_contains($str, 'okt') || str_contains($str, 'oct')) return 10;
        if (str_contains($str, 'nov')) return 11;
        if (str_contains($str, 'des')) return 12;

        return null;
    }

    private function extractTiaraMonthAndYear($row): array
    {
        $y = trim((string)($row->year ?? $row->yea ?? $row->tahun ?? ''));
        $mStr = trim((string)($row->month ?? $row->bulan ?? ''));
        $m = $this->parseMonthNum($mStr);

        if ($m && !empty($y) && strlen($y) === 4) {
            return [$m, $y];
        }

        $dateStr = $row->maintenance_date ?? $row->maintenance_d ?? $row->tgl_maintenance ?? $row->created_at ?? null;
        if (!empty($dateStr)) {
            $trimmed = trim((string)$dateStr);
            if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/', $trimmed, $mMatch)) {
                return [(int)$mMatch[2], (string)$mMatch[1]];
            }
            if (preg_match('/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/', $trimmed, $mMatch)) {
                return [(int)$mMatch[2], (string)$mMatch[3]];
            }
            try {
                $dt = Carbon::parse($trimmed);
                return [$dt->month, (string)$dt->year];
            } catch (\Exception $e) {}
        }

        return [null, null];
    }

    public function getSummaryData(Request $request): array
    {
        @set_time_limit(120);

        $tahunFilter    = $this->parseFilterValue($request->input('tahun'), 'ALL');
        $rtpFilter      = $this->parseFilterValue($request->input('rtp'), 'ALL');
        $regionalFilter = $this->parseFilterValue($request->input('regional') ?? $request->input('sitearea_reg'), 'ALL');
        $siteIdFilter   = $this->parseFilterValue($request->input('site_id'), 'ALL');

        $dedupedRecords   = [];
        $availableYears   = [];
        $availableRegs    = [];
        $availableSiteIds = [];

        // Fetch data
        $tiaraRecords = DB::table('rpm_tiara_masters')->get();
        $antRecords   = DB::table('rpm_masters')->get();

        // 0. BUAT MAPPING TO -> REGIONAL DARI DATA TIARA
        $toToRegMap = [];
        foreach ($tiaraRecords as $row) {
            $toNorm = $this->normalizeToName($row->sitearea_to ?? $row->to ?? '');
            $regVal = strtoupper(trim((string)($row->sitearea_reg ?? $row->regional ?? $row->sitearea_i ?? '')));
            if ($toNorm !== 'UNASSIGNED' && !empty($regVal) && $regVal !== 'UNASSIGNED' && str_starts_with($regVal, 'REG')) {
                $toToRegMap[$toNorm] = $regVal;
            }
        }

        // 1. PROSES DATA RPM (ANT)
        foreach ($antRecords as $row) {
            $y = trim((string)($row->tahun ?? ''));
            $m = $this->parseMonthNum($row->bulan ?? '') ?? 12;

            if (empty($y)) continue;
            $availableYears[$y] = true;

            $siteId = trim($row->site_id ?? $row->siteid ?? '');
            $siteIdNorm = $this->normalizeSiteId($siteId);
            if (!empty($siteIdNorm)) {
                $availableSiteIds[$siteIdNorm] = $siteIdNorm;
            }

            $toNormalized = $this->normalizeToName($row->rtp ?? '');

            // Cari regional ANT Master via mapping TO
            $rawReg = strtoupper(trim((string)($row->regional ?? $row->sitearea_reg ?? $row->reg ?? '')));
            if (!empty($rawReg) && $rawReg !== 'UNASSIGNED' && str_starts_with($rawReg, 'REG')) {
                $regVal = $rawReg;
            } else {
                if (isset($toToRegMap[$toNormalized])) {
                    $regVal = $toToRegMap[$toNormalized];
                } elseif (str_starts_with($toNormalized, 'REG')) {
                    $regVal = $toNormalized;
                } else {
                    $regVal = 'UNASSIGNED';
                }
            }

            if ($regVal !== 'UNASSIGNED' && str_starts_with($regVal, 'REG')) {
                $availableRegs[$regVal] = $regVal;
            }

            if (!empty($tahunFilter) && strtoupper($tahunFilter) !== 'ALL' && $y !== $tahunFilter) {
                continue;
            }

            if (!empty($rtpFilter) && strtoupper($rtpFilter) !== 'ALL') {
                if ($toNormalized !== $this->normalizeToName($rtpFilter)) {
                    continue;
                }
            }

            if (!empty($regionalFilter) && strtoupper($regionalFilter) !== 'ALL') {
                if ($regVal !== strtoupper(trim($regionalFilter))) {
                    continue;
                }
            }

            if (!empty($siteIdFilter) && strtoupper($siteIdFilter) !== 'ALL') {
                if ($siteIdNorm !== $this->normalizeSiteId($siteIdFilter)) {
                    continue;
                }
            }

            $stRaw = strtolower(trim($row->approve ?? ''));
            if (in_array($stRaw, ['ok', 'approved', 'approve'])) {
                $st = 'APPROVED'; $rank = 1;
            } elseif (in_array($stRaw, ['reject', 'nok']) || str_contains($stRaw, 'reject')) {
                $st = 'REJECTED'; $rank = 2;
            } elseif (in_array($stRaw, ['return', 'revisi']) || str_contains($stRaw, 'return') || str_contains($stRaw, 'revisi')) {
                $st = 'RETURNED'; $rank = 3;
            } else {
                $st = 'PENDING'; $rank = 4;
            }

            if ($y === '2025') {
                $uniqueKey = "2025_{$m}_{$siteId}_ANT_{$row->id}";
            } else {
                $uniqueKey = !empty($siteIdNorm)
                    ? "2026_{$m}_{$siteIdNorm}"
                    : "2026_{$m}_NO_SITE_ANT_{$row->id}";
            }

            if (!isset($dedupedRecords[$uniqueKey]) || $rank < $dedupedRecords[$uniqueKey]['rank']) {
                $existingReg = $dedupedRecords[$uniqueKey]['regional'] ?? 'UNASSIGNED';
                $finalReg = ($regVal !== 'UNASSIGNED') ? $regVal : $existingReg;

                $existingTo = $dedupedRecords[$uniqueKey]['to'] ?? 'UNASSIGNED';
                $finalTo = ($toNormalized !== 'UNASSIGNED') ? $toNormalized : $existingTo;

                $dedupedRecords[$uniqueKey] = [
                    'month'    => $m,
                    'year'     => $y,
                    'to'       => $finalTo,
                    'regional' => $finalReg,
                    'site_id'  => $siteIdNorm,
                    'status'   => $st,
                    'rank'     => $rank,
                ];
            }
        }

        // 2. PROSES DATA RPM (TIARA)
        foreach ($tiaraRecords as $row) {
            [$m, $y] = $this->extractTiaraMonthAndYear($row);

            if (!$m || empty($y)) continue;
            $availableYears[$y] = true;

            $siteId = trim($row->siteoperator_co ?? $row->siteoperator_code ?? $row->site_id ?? $row->siteid ?? $row->no_tiket_tiara ?? '');
            $siteIdNorm = $this->normalizeSiteId($siteId);
            if (!empty($siteIdNorm)) {
                $availableSiteIds[$siteIdNorm] = $siteIdNorm;
            }

            $rawReg = strtoupper(trim((string)($row->sitearea_reg ?? $row->regional ?? $row->sitearea_i ?? '')));
            $regVal = (!empty($rawReg) && str_starts_with($rawReg, 'REG')) ? $rawReg : 'UNASSIGNED';
            if ($regVal !== 'UNASSIGNED') {
                $availableRegs[$regVal] = $regVal;
            }

            if (!empty($tahunFilter) && strtoupper($tahunFilter) !== 'ALL' && $y !== $tahunFilter) {
                continue;
            }

            $toNormalized = $this->normalizeToName($row->sitearea_to ?? $row->to ?? '');
            if (!empty($rtpFilter) && strtoupper($rtpFilter) !== 'ALL') {
                if ($toNormalized !== $this->normalizeToName($rtpFilter)) {
                    continue;
                }
            }

            if (!empty($regionalFilter) && strtoupper($regionalFilter) !== 'ALL') {
                if ($regVal !== strtoupper(trim($regionalFilter))) {
                    continue;
                }
            }

            if (!empty($siteIdFilter) && strtoupper($siteIdFilter) !== 'ALL') {
                if ($siteIdNorm !== $this->normalizeSiteId($siteIdFilter)) {
                    continue;
                }
            }

            $stRaw = strtoupper(trim($row->dashboard_status ?? ''));
            $rank = match ($stRaw) {
                'APPROVED', 'OK', 'DONE' => 1,
                'REJECTED', 'REJECT'     => 2,
                'RETURNED', 'RETURN'     => 3,
                default                  => 4
            };
            $st = match ($rank) {
                1 => 'APPROVED',
                2 => 'REJECTED',
                3 => 'RETURNED',
                default => 'PENDING'
            };

            if ($y === '2025') {
                $uniqueKey = "2025_{$m}_{$siteId}_TIARA_{$row->id}";
            } else {
                $uniqueKey = !empty($siteIdNorm)
                    ? "2026_{$m}_{$siteIdNorm}"
                    : "2026_{$m}_NO_SITE_TIARA_{$row->id}";
            }

            if (!isset($dedupedRecords[$uniqueKey]) || $rank < $dedupedRecords[$uniqueKey]['rank']) {
                $existingTo = $dedupedRecords[$uniqueKey]['to'] ?? 'UNASSIGNED';
                $finalTo = ($toNormalized !== 'UNASSIGNED') ? $toNormalized : $existingTo;

                $existingReg = $dedupedRecords[$uniqueKey]['regional'] ?? 'UNASSIGNED';
                $finalReg = ($regVal !== 'UNASSIGNED') ? $regVal : $existingReg;

                $dedupedRecords[$uniqueKey] = [
                    'month'    => $m,
                    'year'     => $y,
                    'to'       => $finalTo,
                    'regional' => $finalReg,
                    'site_id'  => $siteIdNorm,
                    'status'   => $st,
                    'rank'     => $rank,
                ];
            }
        }

        // 3. AGREGASI HASIL GABUNGAN
        $totDoc = 0; $totApp = 0; $totRej = 0; $totRet = 0; $totPen = 0;
        $monthlyParsed = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthlyParsed[$i] = ['ok' => 0, 'belum' => 0, 'reject' => 0, 'returnVal' => 0];
        }
        $toPivotMap       = [];
        $regionalPivotMap = [];

        foreach ($dedupedRecords as $item) {
            $totDoc++;
            $st  = $item['status'];
            $m   = $item['month'];
            $to  = $item['to'];
            $reg = $item['regional'];

            // Agregasi Regional per Bulan
            if (!isset($regionalPivotMap[$reg])) {
                $regionalPivotMap[$reg] = array_fill(1, 12, 0);
            }
            if ($m >= 1 && $m <= 12) {
                $regionalPivotMap[$reg][$m]++;
            }

            if (!isset($toPivotMap[$to])) {
                $toPivotMap[$to] = ['ok' => 0, 'belum' => 0, 'reject' => 0, 'returnVal' => 0, 'total' => 0];
            }
            $toPivotMap[$to]['total']++;

            if ($st === 'APPROVED') {
                $totApp++;
                $statusCat = 'ok';
                $toPivotMap[$to]['ok']++;
            } elseif ($st === 'REJECTED') {
                $totRej++;
                $statusCat = 'reject';
                $toPivotMap[$to]['reject']++;
            } elseif ($st === 'RETURNED') {
                $totRet++;
                $statusCat = 'returnVal';
                $toPivotMap[$to]['returnVal']++;
            } else {
                $totPen++;
                $statusCat = 'belum';
                $toPivotMap[$to]['belum']++;
            }

            if ($m >= 1 && $m <= 12) {
                $monthlyParsed[$m][$statusCat]++;
            }
        }

        // Pivot Regional: HANYA MEMERIKSA REGIONAL YANG DIAWALI 'REG' (REG 12, REG 3)
        $combinedRegionalPivot = [];
        foreach ($regionalPivotMap as $regName => $mCounts) {
            if (!str_starts_with($regName, 'REG')) continue;

            $countsArray = [];
            $sum = 0;
            for ($i = 1; $i <= 12; $i++) {
                $val = $mCounts[$i] ?? 0;
                $countsArray[] = $val;
                $sum += $val;
            }
            $combinedRegionalPivot[] = [
                'regional' => $regName,
                'counts'   => $countsArray,
                'total'    => $sum,
            ];
        }
        usort($combinedRegionalPivot, fn($a, $b) => strcmp($a['regional'], $b['regional']));

        // Pivot TO/RTP
        $rtpPivot = [];
        foreach ($toPivotMap as $toName => $countsData) {
            $tot = $countsData['total'];
            $ok  = $countsData['ok'];
            $rtpPivot[] = [
                'rtp'       => $toName,
                'ok'        => $ok,
                'belum'     => $countsData['belum'],
                'reject'    => $countsData['reject'],
                'returnVal' => $countsData['returnVal'],
                'total'     => $tot,
                'pct'       => $tot > 0 ? round(($ok / $tot) * 100) : 0,
            ];
        }
        usort($rtpPivot, fn($a, $b) => strcmp($a['rtp'], $b['rtp']));

        // Grafik Bulanan
        $monthsName     = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $fullMonthsName = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $chartData = [];
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

            $chartData[] = [
                'name'      => $monthsName[$m - 1],
                'monthNum'  => $m,
                'fullMonth' => $fullMonthsName[$m - 1],
                'total'     => $mTotal,
                'ok'        => $okVal,
                'belum'     => $belumVal,
                'reject'    => $rejectVal,
                'return'    => $retVal,
                'pctOk'     => $mTotal > 0 ? round(($okVal / $mTotal) * 100) : 0,
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
        ];

        $overallTotal = array_sum($monthTotals);

        $yearList = array_keys($availableYears);
        sort($yearList);

        $regList = array_values($availableRegs);
        sort($regList);

        $siteIdList = array_values($availableSiteIds);
        sort($siteIdList);

        return [
            'summary' => [
                'totalSite'     => $totDoc,
                'totalApproved' => $totApp,
                'totalPending'  => $totPen,
                'totalReject'   => $totRej,
                'totalReturn'   => $totRet,
                'chartData'     => $chartData,
                'monthlyPivot'  => [
                    'counts'       => $counts,
                    'monthTotals'  => $monthTotals,
                    'monthPct'     => $monthPct,
                    'rowTotals'    => $rowTotals,
                    'overallTotal' => $overallTotal,
                    'overallPct'   => $overallTotal > 0 ? round(($totApp / $overallTotal) * 100) : 0,
                ],
                'rtpPivot'      => $rtpPivot,
                'regionalPivot' => $combinedRegionalPivot,
            ],
            'options' => [
                'tahun'        => $yearList,
                'rtp'          => array_values(array_unique(array_map(fn($x) => $x['rtp'], $rtpPivot))),
                'regional'     => $regList,
                'sitearea_reg' => $regList,
                'site_id'      => $siteIdList,
            ],
            'filters' => [
                'tahun'        => $tahunFilter,
                'rtp'          => $rtpFilter,
                'regional'     => $regionalFilter,
                'sitearea_reg' => $regionalFilter,
                'site_id'      => $siteIdFilter,
            ]
        ];
    }
}