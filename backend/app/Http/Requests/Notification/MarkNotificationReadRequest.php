<?php

namespace App\Http\Requests\Notification;

use Illuminate\Foundation\Http\FormRequest;

class MarkNotificationReadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => 'nullable|integer',
            'type' => 'required_without:id|string|max:50',
            'reference_id' => 'required_without:id|string|max:191',
            'gym_id' => 'nullable|integer',
        ];
    }
}

