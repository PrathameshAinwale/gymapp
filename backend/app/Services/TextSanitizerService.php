<?php

namespace App\Services;

class TextSanitizerService
{
    /**
     * Capitalize the first letter of each word in a string,
     * preserving existing uppercase characters and acronyms.
     *
     * Example:
     * - "rahul sharma" -> "Rahul Sharma"
     * - "123 main street, apt 4b" -> "123 Main Street, Apt 4b"
     * - "pt session with vip coach" -> "Pt Session With Vip Coach"
     */
    public static function toTitleCase(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        // Capitalize first letter of every word following start of string or delimiters
        return preg_replace_callback('/(^|[\s\-\/\(\[\'"])([a-z])/u', function ($matches) {
            return $matches[1] . mb_strtoupper($matches[2], 'UTF-8');
        }, $value);
    }

    /**
     * Apply title-casing to a list of specified fields in a payload array.
     */
    public static function sanitizeArray(array $data, array $titleCaseKeys): array
    {
        foreach ($titleCaseKeys as $key) {
            if (isset($data[$key]) && is_string($data[$key])) {
                $data[$key] = self::toTitleCase($data[$key]);
            }
        }
        return $data;
    }
}
