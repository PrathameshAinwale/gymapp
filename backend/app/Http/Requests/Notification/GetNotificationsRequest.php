<?php

namespace App\Http\Requests\Notification;

use Illuminate\Foundation\Http\FormRequest;

class GetNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cursor' => 'nullable|string',
            'limit' => 'nullable|integer|min:1|max:100',
            'type' => 'nullable|string|max:50',
            'is_read' => 'nullable|in:true,false,1,0',
            'since' => 'nullable|string',
            'gym_id' => 'nullable|integer',
        ];
    }
}

