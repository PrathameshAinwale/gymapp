<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('whatsapp:process-triggers', function () {
    $this->info('Scanning database for today\'s birthdays and automated triggers...');
    $result = \App\Services\WhatsAppNotificationService::processDailyBirthdayGreetings(null);
    $this->info("Completed: {$result['count']} birthday greetings dispatched using master birthday template.");
})->purpose('Scan database for birthdays and auto-dispatch WhatsApp greetings');

// Automatically check database daily at 09:00 AM for members whose birthday is today
Schedule::command('whatsapp:process-triggers')->dailyAt('09:00');

Artisan::command('members:sync-status', function () {
    $this->info('Synchronizing member expiry statuses in database...');
    \App\Http\Controllers\Api\MemberController::syncAllMemberStatuses(true);
    $this->info('Member statuses successfully synchronized.');
})->purpose('Batch synchronize all member expiry statuses based on plan end date');

// Run status sync once daily shortly after midnight
Schedule::command('members:sync-status')->dailyAt('00:05');

