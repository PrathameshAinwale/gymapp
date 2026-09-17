<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RevenueBilling extends Model
{
    use HasFactory;

    protected $table = 'revenue_and_billings';

    protected $fillable = [
        'gym_id',
        'type', // 'inflow' or 'outflow'
        'reference_no',
        'user_id',
        'member_name',
        'plan_id',
        'plan_name',
        'title',
        'category',
        'vendor',
        'amount',
        'date',
        'payment_method',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'date' => 'date',
    ];

    // Scopes
    public function scopeInflow($query)
    {
        return $query->where('type', 'inflow');
    }

    public function scopeOutflow($query)
    {
        return $query->where('type', 'outflow');
    }

    public function scopeForGym($query, int $gymId)
    {
        return $query->where(function ($q) use ($gymId) {
            $q->where('gym_id', $gymId);
            if ($gymId == 1) {
                $q->orWhereNull('gym_id');
            }
        });
    }

    // Relationships
    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

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
}
