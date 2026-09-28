<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('whatsapp:process-triggers', function () {
    $this->info('Scanning database for today\'s birthdays and automated triggers...');
    $controller = new \App\Http\Controllers\Api\WhatsAppController();
    $result = $controller->executeAutoTriggersDirect(null);
    $this->info("Completed: {$result['birthdays_count']} birthday greetings processed using master birthday template.");
})->purpose('Scan database for birthdays and auto-dispatch WhatsApp greetings');

// Automatically check database daily at 09:00 AM for members whose birthday is today
Schedule::command('whatsapp:process-triggers')->dailyAt('09:00');
