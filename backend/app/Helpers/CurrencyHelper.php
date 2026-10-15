<?php

namespace App\Helpers;

class CurrencyHelper
{
    /**
     * Format amount using gym's currency symbol.
     */
    public static function format(float|int|string|null $amount, string $currencySymbol = '₹'): string
    {
        $num = (float)($amount ?? 0);
        $formatted = number_format($num, 2, '.', ',');
        if (str_ends_with($formatted, '.00')) {
            $formatted = substr($formatted, 0, -3);
        }
        $symbol = (!empty($currencySymbol) && !str_contains($currencySymbol, 'â')) ? $currencySymbol : '₹';
        return "{$symbol}{$formatted}";
    }
}
