<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'gym_class_id',
        'user_id',
        'invoice_id',
        'enrolled_date',
        'status',
    ];

    protected $casts = [
        'enrolled_date' => 'date',
    ];

    public function gymClass()
    {
        return $this->belongsTo(GymClass::class, 'gym_class_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
