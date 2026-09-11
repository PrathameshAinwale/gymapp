<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'title',
        'category',
        'vendor',
        'amount',
        'date',
        'payment_mode',
        'ref_no',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'date' => 'date:Y-m-d',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
