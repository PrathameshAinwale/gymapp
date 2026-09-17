<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FinancialTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id', 'type', 'category', 'description',
        'amount', 'date', 'reference_id', 'reference_type', 'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'date' => 'date',
    ];

    // Scopes
    public function scopeInflow($query)
    {
        return $query->where('type', 'Inflow');
    }

    public function scopeOutflow($query)
    {
        return $query->where('type', 'Outflow');
    }

    public function scopeForGym($query, int $gymId)
    {
        return $query->where('gym_id', $gymId);
    }

    // Summary helper
    public static function summary(int $gymId): array
    {
        $inflow = self::forGym($gymId)->inflow()->sum('amount');
        $outflow = self::forGym($gymId)->outflow()->sum('amount');
        return [
            'total_inflow' => round($inflow, 2),
            'total_outflow' => round($outflow, 2),
            'net' => round($inflow - $outflow, 2),
        ];
    }
}
