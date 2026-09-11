<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'gym_id',
        'name',
        'category',
        'price',
        'stock',
        'min_stock_alert',
        'status',
        'image',
    ];

    protected $casts = [
        'price' => 'float',
        'stock' => 'integer',
        'min_stock_alert' => 'integer',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }
}
