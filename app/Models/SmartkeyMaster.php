<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmartkeyMaster extends Model
{
    use HasFactory;

    protected $table = 'smartkey_masters';

    // Menggunakan guarded kosong agar semua kolom (termasuk lock_id) dapat diisi via mass assignment
    protected $guarded = [];
}