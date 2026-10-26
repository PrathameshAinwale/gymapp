<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GymRole extends Model
{
    use HasFactory;

    protected $table = 'gym_roles';

    protected $fillable = [
        'gym_id',
        'name',
        'slug',
        'description',
        'color',
        'assigned_pages',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'assigned_pages' => 'array',
            'is_default' => 'boolean',
        ];
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gym_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'role', 'slug')
            ->where('gym_id', $this->gym_id);
    }
}
