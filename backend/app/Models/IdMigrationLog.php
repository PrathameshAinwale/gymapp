<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdMigrationLog extends Model
{
    protected $table = 'id_migration_log';

    public $timestamps = false;

    protected $fillable = [
        'entity',
        'gym_id',
        'record_id',
        'old_id',
        'new_id',
        'batch_id',
        'migrated_at',
    ];

    protected $casts = [
        'migrated_at' => 'datetime',
    ];
}
