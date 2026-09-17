<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'employee_id',
        'employee_name',
        'role',
        'month',
        'base_salary',
        'bonus',
        'deductions',
        'net_pay',
        'commission_earned',
        'incentives',
        'adjusted_by',
        'notes',
        'status',
        'pay_date',
    ];

    protected $casts = [
        'base_salary' => 'float',
        'bonus' => 'float',
        'deductions' => 'float',
        'net_pay' => 'float',
        'commission_earned' => 'float',
        'incentives' => 'float',
        'pay_date' => 'date:Y-m-d',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }
}
