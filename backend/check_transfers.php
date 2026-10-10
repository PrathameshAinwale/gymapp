<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Total Users: " . App\Models\User::count() . "\n";
foreach (App\Models\User::all() as $u) {
    echo "User #{$u->id} ({$u->name}, role={$u->role}, gym_id={$u->gym_id})\n";
}
