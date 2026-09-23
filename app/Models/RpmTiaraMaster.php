<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RpmTiaraMaster extends Model
{
    use HasFactory;

    protected $table = 'rpm_tiara_masters';

    // Mengizinkan semua field untuk di-insert/update
    protected $guarded = [];
}