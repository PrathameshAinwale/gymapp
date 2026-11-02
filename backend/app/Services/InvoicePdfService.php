<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Gym;
use App\Models\GymSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * INVOICE PDF GENERATION SERVICE (Backend Adobe PDF 1.4 PostScript Stream Engine)
 *
 * CORE ARCHITECTURAL RULES (PREVENT TEXT/CONTENT OVERFLOW):
 * 1. ALWAYS WRAP: Every piece of text must be wrapped to its container's maximum width.
 *    Never draw raw PostScript text without an explicit width constraint.
 * 2. UNBROKEN STRINGS: Always break unbroken words (long names, URLs, emails, hashes)
 *    using character-level splitting if they exceed maxWidth.
 * 3. DYNAMIC HEIGHTS: Never hardcode fixed container/box/row heights for variable content.
 *    Measure wrapped text height first, then draw the enclosing card, row, or box.
 * 4. PAGINATION: Check remaining vertical space before rendering elements.
 *    If an element would cross the bottom margin, start a new page.
 *    Table headers must repeat on new pages, and rows must not be split across pages.
 * 5. SAFE VALUES: Always sanitize and safely convert null, numbers, and strings before drawing.
 * 6. ZERO DEPENDENCIES: Output strictly valid Adobe PDF 1.4 multi-page document structure.
 */
class InvoicePdfService
{
    /**
     * Standard Helvetica character width metrics (1/1000 em).
     */
    private static function getCharWidths(): array
    {
        static $widths = [
            ' ' => 278, '!' => 278, '"' => 355, '#' => 556, '$' => 556, '%' => 889, '&' => 667, '\'' => 191,
            '(' => 333, ')' => 333, '*' => 389, '+' => 584, ',' => 278, '-' => 333, '.' => 278, '/' => 278,
            '0' => 556, '1' => 556, '2' => 556, '3' => 556, '4' => 556, '5' => 556, '6' => 556, '7' => 556,
            '8' => 556, '9' => 556, ':' => 278, ';' => 278, '<' => 584, '=' => 584, '>' => 584, '?' => 556,
            '@' => 1015,
            'A' => 667, 'B' => 667, 'C' => 722, 'D' => 722, 'E' => 667, 'F' => 611, 'G' => 778, 'H' => 722,
            'I' => 278, 'J' => 500, 'K' => 667, 'L' => 556, 'M' => 833, 'N' => 722, 'O' => 778, 'P' => 667,
            'Q' => 778, 'R' => 722, 'S' => 667, 'T' => 611, 'U' => 722, 'V' => 667, 'W' => 944, 'X' => 667,
            'Y' => 667, 'Z' => 611,
            '[' => 278, '\\' => 278, ']' => 278, '^' => 469, '_' => 556, '`' => 222,
            'a' => 556, 'b' => 556, 'c' => 500, 'd' => 556, 'e' => 556, 'f' => 278, 'g' => 556, 'h' => 556,
            'i' => 222, 'j' => 222, 'k' => 500, 'l' => 222, 'm' => 833, 'n' => 556, 'o' => 556, 'p' => 556,
            'q' => 556, 'r' => 333, 's' => 500, 't' => 278, 'u' => 556, 'v' => 500, 'w' => 722, 'x' => 500,
            'y' => 500, 'z' => 500,
            '{' => 334, '|' => 260, '}' => 334, '~' => 584
        ];
        return $widths;
    }

    /**
     * Measure text width in points using Helvetica metrics.
     */
    public static function getTextWidth(string $text, float $size = 10, bool $bold = false): float
    {
        $widths = self::getCharWidths();
        $clean = preg_replace('/[^\x20-\x7E]/', '', $text);
        $boldMultiplier = $bold ? 1.06 : 1.0;
        $len = strlen($clean);
        $w = 0;
        for ($i = 0; $i < $len; $i++) {
            $c = $clean[$i];
            $charW = $widths[$c] ?? 556;
            $w += ($charW / 1000.0) * $size * $boldMultiplier;
        }
        return $w;
    }

    /**
     * Wrap text within maxWidth, forcing character-level breaking for unbroken words.
     */
    public static function wrapText(string $text, float $maxWidth, float $size = 10, bool $bold = false): array
    {
        $text = str_replace(["\r\n", "\r"], "\n", (string)$text);
        $paragraphs = explode("\n", $text);
        $result = [];

        foreach ($paragraphs as $paragraph) {
            $trimmed = trim($paragraph);
            if ($trimmed === '') {
                $result[] = '';
                continue;
            }

            $words = preg_split('/\s+/', $trimmed);
            $safeWords = [];

            foreach ($words as $word) {
                if (self::getTextWidth($word, $size, $bold) > $maxWidth) {
                    // Character-level break for words exceeding maxWidth
                    $chunk = '';
                    $wLen = strlen($word);
                    for ($i = 0; $i < $wLen; $i++) {
                        $c = $word[$i];
                        if (self::getTextWidth($chunk . $c, $size, $bold) <= $maxWidth) {
                            $chunk .= $c;
                        } else {
                            if ($chunk !== '') {
                                $safeWords[] = $chunk;
                            }
                            $chunk = $c;
                        }
                    }
                    if ($chunk !== '') {
                        $safeWords[] = $chunk;
                    }
                } else {
                    $safeWords[] = $word;
                }
            }

            // Word wrap
            $currentLine = '';
            foreach ($safeWords as $word) {
                $testLine = $currentLine === '' ? $word : $currentLine . ' ' . $word;
                if (self::getTextWidth($testLine, $size, $bold) <= $maxWidth) {
                    $currentLine = $testLine;
                } else {
                    if ($currentLine !== '') {
                        $result[] = $currentLine;
                    }
                    $currentLine = $word;
                }
            }
            if ($currentLine !== '') {
                $result[] = $currentLine;
            }
        }

        return $result;
    }

    /**
     * Ensure an invoice has a valid stored PDF file and return its public URL.
     */
    public static function ensurePdf(Invoice $invoice): string
    {
        $fileName = 'invoices/' . preg_replace('/[^A-Za-z0-9_\-]/', '_', $invoice->invoice_number) . '.pdf';
        
        // If file already exists and is non-empty, return existing public URL
        if (Storage::disk('public')->exists($fileName) && Storage::disk('public')->size($fileName) > 200) {
            $url = asset('storage/' . $fileName);
            if ($invoice->invoice_url !== $url) {
                $invoice->invoice_url = $url;
                $invoice->saveQuietly();
            }
            return $url;
        }

        // Generate and save fresh PDF
        return self::saveToFile($invoice);
    }

    /**
     * Save newly generated PDF to storage and update invoice record.
     */
    public static function saveToFile(Invoice $invoice): string
    {
        $rawPdf = self::generate($invoice);
        $fileName = 'invoices/' . preg_replace('/[^A-Za-z0-9_\-]/', '_', $invoice->invoice_number) . '.pdf';

        // Ensure directory exists
        Storage::disk('public')->makeDirectory('invoices');
        Storage::disk('public')->put($fileName, $rawPdf);

        $url = asset('storage/' . $fileName);
        $invoice->invoice_url = $url;
        $invoice->saveQuietly();

        return $url;
    }

    /**
     * Save an uploaded PDF blob from frontend.
     */
    public static function saveUploadedPdf(Invoice $invoice, UploadedFile $file): string
    {
        $fileName = 'invoices/' . preg_replace('/[^A-Za-z0-9_\-]/', '_', $invoice->invoice_number) . '.pdf';
        Storage::disk('public')->makeDirectory('invoices');
        Storage::disk('public')->putFileAs('invoices', $file, basename($fileName));

        $url = asset('storage/' . $fileName);
        $invoice->invoice_url = $url;
        $invoice->saveQuietly();

        return $url;
    }

    /**
     * Generate standard Adobe PDF 1.4 Tax Invoice binary document with dynamic wrapping and multi-page pagination.
     */
    public static function generate(Invoice $invoice): string
    {
        $gym = $invoice->gym ?: Gym::find($invoice->gym_id ?: 1);
        $gymSetting = GymSetting::first();

        $gymName = strtoupper($gym?->name ?: ($gymSetting?->name ?? 'FITNESS CLUB'));
        $gymAddress = $gym?->address ?: ($gymSetting?->address ?: 'Main Facility Center');
        if ($gym?->city && !str_contains($gymAddress, $gym->city)) {
            $gymAddress .= ', ' . $gym->city;
        }
        $gymPhone = $gym?->phone ?: ($gymSetting?->phone ?: '');
        $gymGst = $gym?->gst_number ?: ($gymSetting?->gst_number ?: '');

        $user = $invoice->user;
        $profile = $user?->memberProfile;
        $memberName = $user?->name ?: 'Member';
        $memberPhone = $user?->phone ?: '';
        $memberEmail = $user?->email ?: '';
        $qrCode = $profile?->qr_pass_code ?: '';

        $invoiceNo = $invoice->invoice_number ?: ('INV-' . date('Y') . '-' . $invoice->id);
        $dateStr = $invoice->date ? $invoice->date->format('d M Y') : date('d M Y');
        $dueDateStr = $invoice->due_date ? $invoice->due_date->format('d M Y') : 'N/A (Settled)';
        $paymentMethod = $invoice->payment_method ?: 'UPI/Cash';

        $paidAmount = (float)($invoice->amount ?? 0);
        $totalAmount = (float)($invoice->total_amount ?: ($invoice->amount ?: 0));
        $pendingAmount = (float)($invoice->pending_amount ?? 0);
        $isPaid = $pendingAmount <= 0;
        $statusStr = $isPaid ? 'PAID & VERIFIED' : 'PENDING BALANCE';

        $planName = $invoice->plan?->name ?: 'Gym Membership Package';
        $startDateStr = $invoice->start_date ? $invoice->start_date->format('d M Y') : $dateStr;
        $endDateStr = $invoice->end_date ? $invoice->end_date->format('d M Y') : 'Active';

        // Prepare line items without truncating or arbitrary row limit
        $items = [];
        if (!empty($invoice->items) && is_array($invoice->items)) {
            foreach ($invoice->items as $it) {
                $pkgType = $it['packageType'] ?? ($it['package_type'] ?? 'Membership Plan');
                $pkgName = $it['name'] ?? ($it['planName'] ?? '');
                $displayName = $pkgType;
                if ($pkgName && strcasecmp($pkgName, $pkgType) !== 0) {
                    $displayName .= " ({$pkgName})";
                }
                $start = $it['startDate'] ?? ($it['start_date'] ?? $startDateStr);
                $end = $it['endDate'] ?? ($it['end_date'] ?? $endDateStr);
                $items[] = [
                    'name'     => $displayName,
                    'validity' => "{$start} to {$end}",
                    'amount'   => (float)($it['net_amount'] ?? ($it['price'] ?? ($it['amount'] ?? $totalAmount))),
                ];
            }
        }
        if (empty($items)) {
            $pkgType = $invoice->package_type ?: 'Gym-Cardio';
            $displayName = $pkgType;
            if ($planName && strcasecmp($planName, $pkgType) !== 0) {
                $displayName .= " ({$planName})";
            }
            $items[] = [
                'name'     => $displayName,
                'validity' => "{$startDateStr} to {$endDateStr}",
                'amount'   => $totalAmount,
            ];
        }

        // Multi-page streaming manager
        $pages = [];
        $currentPageStream = '';

        $stream = function (string $cmd) use (&$currentPageStream) {
            $currentPageStream .= $cmd . "\n";
        };

        $drawRect = function (float $x, float $y, float $w, float $h, float $r, float $g, float $b, bool $fill = true) use ($stream) {
            if ($fill) {
                $stream(sprintf("%.2F %.2F %.2F rg", $r, $g, $b));
                $stream(sprintf("%.2F %.2F %.2F %.2F re f", $x, $y, $w, $h));
            } else {
                $stream(sprintf("%.2F %.2F %.2F RG", $r, $g, $b));
                $stream(sprintf("%.2F %.2F %.2F %.2F re S", $x, $y, $w, $h));
            }
        };

        $drawLine = function (float $x1, float $y1, float $x2, float $y2, float $r = 0.85, float $g = 0.85, float $b = 0.85, float $w = 1) use ($stream) {
            $stream(sprintf("%.2F w", $w));
            $stream(sprintf("%.2F %.2F %.2F RG", $r, $g, $b));
            $stream(sprintf("%.2F %.2F m %.2F %.2F l S", $x1, $y1, $x2, $y2));
        };

        $addText = function (string $text, float $x, float $y, string $font = 'F1', float $size = 10, float $r = 0, float $g = 0, float $b = 0) use ($stream) {
            $clean = preg_replace('/[^\x20-\x7E]/', '', $text);
            $escaped = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $clean);
            $stream("BT");
            $stream(sprintf("/%s %.2F Tf", $font, $size));
            $stream(sprintf("%.2F %.2F %.2F rg", $r, $g, $b));
            $stream(sprintf("%.2F %.2F Td", $x, $y));
            $stream(sprintf("(%s) Tj", $escaped));
            $stream("ET");
        };

        $drawTableHeader = function (float $headerY) use ($drawRect, $addText) {
            $drawRect(36, $headerY, 523, 24, 0.15, 0.20, 0.25, true);
            $addText("#", 46, $headerY + 8, 'F2', 8.5, 1, 1, 1);
            $addText("PLAN / SERVICE DESCRIPTION", 70, $headerY + 8, 'F2', 8.5, 1, 1, 1);
            $addText("VALIDITY PERIOD", 310, $headerY + 8, 'F2', 8.5, 1, 1, 1);
            $addText("AMOUNT (INR)", 470, $headerY + 8, 'F2', 8.5, 1, 1, 1);
        };

        $startNewPage = function () use (&$pages, &$currentPageStream, $invoiceNo, $drawRect, $addText, $drawTableHeader) {
            $pages[] = $currentPageStream;
            $currentPageStream = '';

            // Continuation header at top of new page
            $drawRect(36, 785, 523, 30, 0.024, 0.306, 0.231, true);
            $titleLines = self::wrapText("INVOICE #" . $invoiceNo . " (Continued)", 490, 10, true);
            $addText($titleLines[0] ?? "INVOICE (Continued)", 50, 795, 'F2', 10, 1, 1, 1);

            // Redraw Table Header
            $drawTableHeader(750);
            return 726; // new rowY
        };

        // --- PAGE 1 RENDERING ---
        // 1. Top Header Banner (Dark Forest Emerald: #064E3B)
        $gymSub = trim($gymAddress . ($gymPhone ? " | Ph: {$gymPhone}" : "") . ($gymGst ? " | GSTIN: {$gymGst}" : ""));
        $gymSubLines = self::wrapText($gymSub, 480, 8, false);
        $bannerHeight = max(75, 50 + (count($gymSubLines) * 11));
        $bannerY = 810 - $bannerHeight;

        $drawRect(36, $bannerY, 523, $bannerHeight, 0.024, 0.306, 0.231, true);
        $addText($gymName, 52, $bannerY + $bannerHeight - 28, 'F2', 17, 1, 1, 1);
        $addText("OFFICIAL TAX INVOICE & MEMBERSHIP RECEIPT", 52, $bannerY + $bannerHeight - 44, 'F2', 9, 0.65, 0.95, 0.75);

        $subY = $bannerY + $bannerHeight - 58;
        foreach ($gymSubLines as $subLine) {
            $addText($subLine, 52, $subY, 'F1', 8, 0.85, 0.95, 0.90);
            $subY -= 11;
        }

        // 2. Invoice Meta Bar
        $invNoLines = self::wrapText("#" . $invoiceNo, 120, 11, true);
        $payModeLines = self::wrapText($paymentMethod, 115, 10, false);
        $metaLinesCount = max(count($invNoLines), count($payModeLines), 1);
        $metaHeight = max(44, 26 + ($metaLinesCount * 12));
        $metaY = $bannerY - 12 - $metaHeight;

        $drawRect(36, $metaY, 523, $metaHeight, 0.96, 0.98, 0.97, true);
        $drawRect(36, $metaY, 523, $metaHeight, 0.85, 0.90, 0.88, false);

        $addText("INVOICE NO:", 50, $metaY + $metaHeight - 16, 'F2', 8, 0.4, 0.45, 0.4);
        $iy = $metaY + $metaHeight - 29;
        foreach ($invNoLines as $line) {
            $addText($line, 50, $iy, 'F2', 11, 0.05, 0.35, 0.2);
            $iy -= 12;
        }

        $addText("ISSUE DATE:", 180, $metaY + $metaHeight - 16, 'F2', 8, 0.4, 0.45, 0.4);
        $addText($dateStr, 180, $metaY + $metaHeight - 29, 'F1', 10, 0.1, 0.1, 0.1);

        $addText("PAYMENT MODE:", 290, $metaY + $metaHeight - 16, 'F2', 8, 0.4, 0.45, 0.4);
        $py = $metaY + $metaHeight - 29;
        foreach ($payModeLines as $line) {
            $addText($line, 290, $py, 'F1', 10, 0.1, 0.1, 0.1);
            $py -= 12;
        }

        // Status Pill
        $pillY = $metaY + ($metaHeight / 2) - 13;
        if ($isPaid) {
            $drawRect(420, $pillY, 124, 26, 0.85, 0.98, 0.88, true);
            $drawRect(420, $pillY, 124, 26, 0.30, 0.75, 0.40, false);
            $addText("STATUS: " . $statusStr, 428, $pillY + 9, 'F2', 8, 0.05, 0.45, 0.15);
        } else {
            $drawRect(420, $pillY, 124, 26, 1.0, 0.92, 0.85, true);
            $drawRect(420, $pillY, 124, 26, 0.95, 0.50, 0.20, false);
            $addText("STATUS: " . $statusStr, 426, $pillY + 9, 'F2', 8, 0.70, 0.25, 0.05);
        }

        // 3. Member Info Card
        $nameLines = self::wrapText($memberName, 215, 10, true);
        $emailLines = self::wrapText($memberEmail ?: 'N/A', 215, 9, false);
        $memberCardHeight = max(85, 52 + ((count($nameLines) + count($emailLines) + 1) * 14));
        $memberCardY = $metaY - 14 - $memberCardHeight;

        $drawRect(36, $memberCardY, 523, $memberCardHeight, 1, 1, 1, true);
        $drawRect(36, $memberCardY, 523, $memberCardHeight, 0.88, 0.90, 0.90, false);

        $addText("MEMBER DETAILS (BILLED TO)", 50, $memberCardY + $memberCardHeight - 20, 'F2', 10, 0.02, 0.35, 0.25);
        $drawLine(50, $memberCardY + $memberCardHeight - 26, 540, $memberCardY + $memberCardHeight - 26, 0.88, 0.92, 0.90, 0.5);

        // Left column details
        $detailY = $memberCardY + $memberCardHeight - 42;
        $addText("Name:", 50, $detailY, 'F1', 9, 0.45, 0.45, 0.45);
        foreach ($nameLines as $nl) {
            $addText($nl, 110, $detailY, 'F2', 10, 0.1, 0.1, 0.1);
            $detailY -= 14;
        }

        $addText("Phone:", 50, $detailY, 'F1', 9, 0.45, 0.45, 0.45);
        $addText($memberPhone ?: 'N/A', 110, $detailY, 'F1', 9.5, 0.1, 0.1, 0.1);
        $detailY -= 14;

        $addText("Email:", 50, $detailY, 'F1', 9, 0.45, 0.45, 0.45);
        foreach ($emailLines as $el) {
            $addText($el, 110, $detailY, 'F1', 9, 0.2, 0.2, 0.2);
            $detailY -= 14;
        }

        // Right column gate access
        $addText("Turnstile Gate Access Pass ID:", 330, $memberCardY + $memberCardHeight - 42, 'F1', 9, 0.45, 0.45, 0.45);
        $passLines = self::wrapText($qrCode ?: 'STANDARD ACCESS', 200, 11, true);
        $passY = $memberCardY + $memberCardHeight - 58;
        foreach ($passLines as $pl) {
            $addText($pl, 330, $passY, 'F2', 11, 0.05, 0.35, 0.25);
            $passY -= 14;
        }

        // 4. Line Items Table
        $tableHeaderY = $memberCardY - 14 - 24;
        $drawTableHeader($tableHeaderY);

        $rowY = $tableHeaderY - 24;
        $idx = 1;

        foreach ($items as $item) {
            $nameLines = self::wrapText($item['name'], 230, 9, true);
            $validityLines = self::wrapText($item['validity'], 150, 8.5, false);
            $lineCount = max(count($nameLines), count($validityLines), 1);
            $rowHeight = max(26, 12 + ($lineCount * 13));

            // Automatic page break if row crosses bottom margin limit
            if ($rowY - $rowHeight < 80) {
                $rowY = $startNewPage();
            }

            // Draw alternating row
            $isEven = ($idx % 2 === 0);
            $drawRect(36, $rowY - ($rowHeight - 20), 523, $rowHeight, $isEven ? 0.98 : 1.0, $isEven ? 0.98 : 1.0, 1.0, true);
            $drawLine(36, $rowY - ($rowHeight - 20), 559, $rowY - ($rowHeight - 20), 0.90, 0.92, 0.92, 0.5);

            $addText(strval($idx), 46, $rowY + 1, 'F1', 9, 0.3, 0.3, 0.3);

            $ny = $rowY + 1;
            foreach ($nameLines as $nl) {
                $addText($nl, 70, $ny, 'F2', 9, 0.1, 0.1, 0.1);
                $ny -= 13;
            }

            $vy = $rowY + 1;
            foreach ($validityLines as $vl) {
                $addText($vl, 310, $vy, 'F1', 8.5, 0.3, 0.3, 0.3);
                $vy -= 13;
            }

            $addText("INR " . number_format($item['amount'], 2), 470, $rowY + 1, 'F2', 9, 0.1, 0.1, 0.1);

            $rowY -= $rowHeight;
            $idx++;
        }

        // 5. Financial Summary Box (Right) & Terms (Left)
        $terms = [
            "1. Membership fees once paid are non-transferable and non-refundable.",
            "2. Turnstile gate scan is mandatory upon entry for biometric safety.",
            "3. Members must adhere to gym floor safety guidelines and gym equipment etiquettes.",
            "4. Official computer-generated receipt. Requires no manual physical signature."
        ];

        $termsLines = [];
        foreach ($terms as $t) {
            $wrappedT = self::wrapText($t, 250, 7.5, false);
            foreach ($wrappedT as $wl) {
                $termsLines[] = $wl;
            }
        }

        $summaryBoxHeight = 120;
        $neededSpace = max($summaryBoxHeight, (count($termsLines) * 12) + 30) + 15;

        if ($rowY - $neededSpace < 80) {
            $pages[] = $currentPageStream;
            $currentPageStream = '';

            // Compact header for summary page
            $drawRect(36, 785, 523, 30, 0.024, 0.306, 0.231, true);
            $addText("INVOICE #" . $invoiceNo . " (Summary & Terms)", 50, 795, 'F2', 10, 1, 1, 1);
            $rowY = 760;
        }

        $summaryBoxY = $rowY - $summaryBoxHeight - 10;
        $drawRect(310, $summaryBoxY, 249, $summaryBoxHeight, 0.97, 0.98, 0.98, true);
        $drawRect(310, $summaryBoxY, 249, $summaryBoxHeight, 0.85, 0.88, 0.88, false);

        $addText("Total Bill Package:", 325, $summaryBoxY + 98, 'F1', 9, 0.4, 0.4, 0.4);
        $addText("INR " . number_format($totalAmount, 2), 460, $summaryBoxY + 98, 'F2', 10, 0.1, 0.1, 0.1);

        $addText("Amount Paid (Settled):", 325, $summaryBoxY + 75, 'F1', 9, 0.4, 0.4, 0.4);
        $addText("INR " . number_format($paidAmount, 2), 460, $summaryBoxY + 75, 'F2', 10, 0.05, 0.45, 0.2);

        $drawLine(320, $summaryBoxY + 62, 545, $summaryBoxY + 62, 0.85, 0.88, 0.88, 0.5);

        $addText("Pending Balance Due:", 325, $summaryBoxY + 44, 'F2', 9.5, 0.7, 0.2, 0.1);
        $addText("INR " . number_format($pendingAmount, 2), 460, $summaryBoxY + 44, 'F2', 10, ($pendingAmount > 0 ? 0.8 : 0.2), 0.1, 0.1);

        $addText("Payment Due Date:", 325, $summaryBoxY + 22, 'F1', 8.5, 0.4, 0.4, 0.4);
        $addText($dueDateStr, 460, $summaryBoxY + 22, 'F1', 8.5, 0.2, 0.2, 0.2);

        // Terms on left side
        $addText("PAYMENT NOTES & TERMS:", 40, $summaryBoxY + 98, 'F2', 8.5, 0.2, 0.25, 0.3);
        $ty = $summaryBoxY + 82;
        foreach ($termsLines as $tl) {
            $addText($tl, 40, $ty, 'F1', 7.5, 0.45, 0.45, 0.45);
            $ty -= 12;
        }

        // Push final page stream
        $pages[] = $currentPageStream;
        $totalPages = count($pages);

        // 6. Running Document Footers across all pages
        $finalPageStreams = [];
        $footerMsg = "Thank you for training with " . ($gym?->name ?: 'our Fitness Family') . "! Let's crush your fitness goals together!";
        $subFooter = "Generated on " . date('d M Y, h:i A') . " | Direct Online Verification: " . config('app.url', 'https://archfit.archenterprises.co.in');

        foreach ($pages as $pIdx => $pStream) {
            $pageNum = $pIdx + 1;
            $fStream = $pStream;

            // Footer divider
            $fStream .= sprintf("%.2F w\n0.85 0.88 0.88 RG\n36.00 70.00 m 559.00 70.00 l S\n", 1.0);

            // Left footer lines
            $cleanMsg = preg_replace('/[^\x20-\x7E]/', '', $footerMsg);
            $cleanSub = preg_replace('/[^\x20-\x7E]/', '', $subFooter);

            $fStream .= "BT\n/F2 9.00 Tf\n0.05 0.35 0.25 rg\n52.00 54.00 Td\n(" . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $cleanMsg) . ") Tj\nET\n";
            $fStream .= "BT\n/F1 7.50 Tf\n0.50 0.50 0.50 rg\n52.00 42.00 Td\n(" . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $cleanSub) . ") Tj\nET\n";

            // Page numbers on right side when multi-page
            if ($totalPages > 1) {
                $pageLabel = "Page {$pageNum} of {$totalPages}";
                $fStream .= "BT\n/F2 8.00 Tf\n0.40 0.45 0.45 rg\n495.00 42.00 Td\n(" . $pageLabel . ") Tj\nET\n";
            }

            $finalPageStreams[] = $fStream;
        }

        // Assemble standard PDF 1.4 binary
        $out = "%PDF-1.4\n";
        $offsets = [];

        // Obj 1: Catalog
        $offsets[1] = strlen($out);
        $out .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

        // Obj 2: Pages
        $kids = [];
        for ($p = 1; $p <= $totalPages; $p++) {
            $pageObjId = 4 + (2 * ($p - 1)) + 1;
            $kids[] = "{$pageObjId} 0 R";
        }
        $kidsStr = implode(' ', $kids);
        $offsets[2] = strlen($out);
        $out .= "2 0 obj\n<< /Type /Pages /Kids [{$kidsStr}] /Count {$totalPages} >>\nendobj\n";

        // Obj 3: Font F1
        $offsets[3] = strlen($out);
        $out .= "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Obj 4: Font F2
        $offsets[4] = strlen($out);
        $out .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Page objects & Content objects
        for ($p = 1; $p <= $totalPages; $p++) {
            $pageObjId = 4 + (2 * ($p - 1)) + 1;
            $contentObjId = $pageObjId + 1;
            $contentStream = $finalPageStreams[$p - 1];
            $streamLen = strlen($contentStream);

            // Page obj
            $offsets[$pageObjId] = strlen($out);
            $out .= "{$pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {$contentObjId} 0 R >>\nendobj\n";

            // Content obj
            $offsets[$contentObjId] = strlen($out);
            $out .= "{$contentObjId} 0 obj\n<< /Length {$streamLen} >>\nstream\n{$contentStream}\nendstream\nendobj\n";
        }

        $totalObjs = 4 + (2 * $totalPages);
        $xrefOffset = strlen($out);
        $out .= "xref\n0 " . ($totalObjs + 1) . "\n0000000000 65535 f \n";
        for ($i = 1; $i <= $totalObjs; $i++) {
            $out .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        $out .= "trailer\n<< /Size " . ($totalObjs + 1) . " /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";
        return $out;
    }
}
