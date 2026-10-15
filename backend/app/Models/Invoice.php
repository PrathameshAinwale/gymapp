<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'invoice_number',
        'user_id',
        'plan_id',
        'package_type',
        'start_date',
        'end_date',
        'amount',
        'pending_amount',
        'total_amount',
        'date',
        'payment_method',
        'status',
        'due_date',
        'invoice_url',
        'created_by',
        'created_by_name',
        'items',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    protected $casts = [
        'amount' => 'float',
        'pending_amount' => 'float',
        'total_amount' => 'float',
        'date' => 'date',
        'due_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'items' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function revenueBilling()
    {
        return $this->hasOne(RevenueBilling::class, 'reference_no', 'invoice_number');
    }
}
