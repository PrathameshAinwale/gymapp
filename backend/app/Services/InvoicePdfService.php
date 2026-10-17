<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Gym;
use App\Models\GymSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class InvoicePdfService
{
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
     * Generate standard Adobe PDF 1.4 Tax Invoice binary document.
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
        $gymEmail = $gym?->email ?: ($gymSetting?->email ?: '');
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

        // Prepare line items
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

        // Build PDF graphics stream
        $s = "";
        $stream = function ($cmd) use (&$s) {
            $s .= $cmd . "\n";
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

        // 1. Top Header Banner (Dark Forest Emerald: #064E3B)
        $drawRect(36, 735, 523, 75, 0.024, 0.306, 0.231, true);
        $addText($gymName, 52, 782, 'F2', 17, 1, 1, 1);
        $addText("OFFICIAL TAX INVOICE & MEMBERSHIP RECEIPT", 52, 766, 'F2', 9, 0.65, 0.95, 0.75);
        $gymSub = trim($gymAddress . ($gymPhone ? " | Ph: {$gymPhone}" : "") . ($gymGst ? " | GSTIN: {$gymGst}" : ""));
        $addText(substr($gymSub, 0, 95), 52, 748, 'F1', 8, 0.85, 0.95, 0.90);

        // 2. Invoice Meta Bar
        $drawRect(36, 680, 523, 44, 0.96, 0.98, 0.97, true);
        $drawRect(36, 680, 523, 44, 0.85, 0.90, 0.88, false);

        $addText("INVOICE NO:", 50, 706, 'F2', 8, 0.4, 0.45, 0.4);
        $addText("#" . $invoiceNo, 50, 692, 'F2', 11, 0.05, 0.35, 0.2);

        $addText("ISSUE DATE:", 180, 706, 'F2', 8, 0.4, 0.45, 0.4);
        $addText($dateStr, 180, 692, 'F1', 10, 0.1, 0.1, 0.1);

        $addText("PAYMENT MODE:", 290, 706, 'F2', 8, 0.4, 0.45, 0.4);
        $addText($paymentMethod, 290, 692, 'F1', 10, 0.1, 0.1, 0.1);

        // Status Pill
        if ($isPaid) {
            $drawRect(420, 688, 124, 26, 0.85, 0.98, 0.88, true);
            $drawRect(420, 688, 124, 26, 0.30, 0.75, 0.40, false);
            $addText("STATUS: " . $statusStr, 428, 698, 'F2', 8, 0.05, 0.45, 0.15);
        } else {
            $drawRect(420, 688, 124, 26, 1.0, 0.92, 0.85, true);
            $drawRect(420, 688, 124, 26, 0.95, 0.50, 0.20, false);
            $addText("STATUS: " . $statusStr, 426, 698, 'F2', 8, 0.70, 0.25, 0.05);
        }

        // 3. Member Info Card
        $drawRect(36, 580, 523, 85, 1, 1, 1, true);
        $drawRect(36, 580, 523, 85, 0.88, 0.90, 0.90, false);

        $addText("MEMBER DETAILS (BILLED TO)", 50, 648, 'F2', 10, 0.02, 0.35, 0.25);
        $drawLine(50, 642, 540, 642, 0.88, 0.92, 0.90, 0.5);

        $addText("Name:", 50, 626, 'F1', 9, 0.45, 0.45, 0.45);
        $addText($memberName, 110, 626, 'F2', 10, 0.1, 0.1, 0.1);

        $addText("Phone:", 50, 608, 'F1', 9, 0.45, 0.45, 0.45);
        $addText($memberPhone ?: 'N/A', 110, 608, 'F1', 9.5, 0.1, 0.1, 0.1);

        $addText("Email:", 50, 592, 'F1', 9, 0.45, 0.45, 0.45);
        $addText($memberEmail ?: 'N/A', 110, 592, 'F1', 9, 0.2, 0.2, 0.2);

        $addText("Turnstile Gate Access Pass ID:", 330, 626, 'F1', 9, 0.45, 0.45, 0.45);
        $addText($qrCode ?: 'STANDARD ACCESS', 330, 610, 'F2', 11, 0.05, 0.35, 0.25);

        // 4. Line Items Table
        // Table Header
        $drawRect(36, 532, 523, 24, 0.15, 0.20, 0.25, true);
        $addText("#", 46, 541, 'F2', 8.5, 1, 1, 1);
        $addText("PLAN / SERVICE DESCRIPTION", 70, 541, 'F2', 8.5, 1, 1, 1);
        $addText("VALIDITY PERIOD", 310, 541, 'F2', 8.5, 1, 1, 1);
        $addText("AMOUNT (INR)", 470, 541, 'F2', 8.5, 1, 1, 1);

        // Rows
        $rowY = 508;
        $idx = 1;
        foreach ($items as $item) {
            $drawRect(36, $rowY - 8, 523, 26, ($idx % 2 === 0) ? 0.98 : 1.0, ($idx % 2 === 0) ? 0.98 : 1.0, 1.0, true);
            $drawLine(36, $rowY - 8, 559, $rowY - 8, 0.90, 0.92, 0.92, 0.5);

            $addText(strval($idx), 46, $rowY + 1, 'F1', 9, 0.3, 0.3, 0.3);
            $addText(substr($item['name'], 0, 42), 70, $rowY + 1, 'F2', 9, 0.1, 0.1, 0.1);
            $addText($item['validity'], 310, $rowY + 1, 'F1', 8.5, 0.3, 0.3, 0.3);
            $addText("INR " . number_format($item['amount'], 2), 470, $rowY + 1, 'F2', 9, 0.1, 0.1, 0.1);

            $rowY -= 28;
            $idx++;
            if ($idx > 4) break; // Limit items on single-page receipt
        }

        // 5. Financial Summary Box (Right Side)
        $summaryBoxY = $rowY - 110;
        $drawRect(310, $summaryBoxY, 249, 120, 0.97, 0.98, 0.98, true);
        $drawRect(310, $summaryBoxY, 249, 120, 0.85, 0.88, 0.88, false);

        $addText("Total Bill Package:", 325, $summaryBoxY + 98, 'F1', 9, 0.4, 0.4, 0.4);
        $addText("INR " . number_format($totalAmount, 2), 460, $summaryBoxY + 98, 'F2', 10, 0.1, 0.1, 0.1);

        $addText("Amount Paid (Settled):", 325, $summaryBoxY + 75, 'F1', 9, 0.4, 0.4, 0.4);
        $addText("INR " . number_format($paidAmount, 2), 460, $summaryBoxY + 75, 'F2', 10, 0.05, 0.45, 0.2);

        $drawLine(320, $summaryBoxY + 62, 545, $summaryBoxY + 62, 0.85, 0.88, 0.88, 0.5);

        $addText("Pending Balance Due:", 325, $summaryBoxY + 44, 'F2', 9.5, 0.7, 0.2, 0.1);
        $addText("INR " . number_format($pendingAmount, 2), 460, $summaryBoxY + 44, 'F2', 10, ($pendingAmount > 0 ? 0.8 : 0.2), 0.1, 0.1);

        $addText("Payment Due Date:", 325, $summaryBoxY + 22, 'F1', 8.5, 0.4, 0.4, 0.4);
        $addText($dueDateStr, 460, $summaryBoxY + 22, 'F1', 8.5, 0.2, 0.2, 0.2);

        // Terms and Left Notes
        $addText("PAYMENT NOTES & TERMS:", 40, $summaryBoxY + 98, 'F2', 8.5, 0.2, 0.25, 0.3);
        $addText("1. Membership fees once paid are non-transferable and non-refundable.", 40, $summaryBoxY + 82, 'F1', 7.5, 0.45, 0.45, 0.45);
        $addText("2. Turnstile gate scan is mandatory upon entry for biometric safety.", 40, $summaryBoxY + 69, 'F1', 7.5, 0.45, 0.45, 0.45);
        $addText("3. Members must adhere to gym floor safety guidelines and gym equipment etiquettes.", 40, $summaryBoxY + 56, 'F1', 7.5, 0.45, 0.45, 0.45);
        $addText("4. Official computer-generated receipt. Requires no manual physical signature.", 40, $summaryBoxY + 43, 'F1', 7.5, 0.45, 0.45, 0.45);

        // 6. Footer Divider & Stamp
        $drawLine(36, 95, 559, 95, 0.85, 0.88, 0.88, 1);
        $addText("Thank you for training with " . ($gym?->name ?: 'our Fitness Family') . "! Let's crush your fitness goals together! 🚀", 52, 75, 'F2', 9, 0.05, 0.35, 0.25);
        $addText("Generated on " . date('d M Y, h:i A') . " | Direct Online Verification: " . config('app.url', 'https://archfit.archenterprises.co.in'), 52, 60, 'F1', 7.5, 0.5, 0.5, 0.5);

        // Assemble PDF objects
        $contentLen = strlen($s);
        $out = "%PDF-1.4\n";
        $offsets = [];

        // Obj 1: Catalog
        $offsets[1] = strlen($out);
        $out .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

        // Obj 2: Pages
        $offsets[2] = strlen($out);
        $out .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";

        // Obj 3: Page (A4: 595.28 x 841.89)
        $offsets[3] = strlen($out);
        $out .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n";

        // Obj 4: Font F1 (Helvetica Regular)
        $offsets[4] = strlen($out);
        $out .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Obj 5: Font F2 (Helvetica Bold)
        $offsets[5] = strlen($out);
        $out .= "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Obj 6: Content Stream
        $offsets[6] = strlen($out);
        $out .= "6 0 obj\n<< /Length {$contentLen} >>\nstream\n" . $s . "endstream\nendobj\n";

        // xref table
        $xrefOffset = strlen($out);
        $out .= "xref\n0 7\n0000000000 65535 f \n";
        for ($i = 1; $i <= 6; $i++) {
            $out .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        // trailer
        $out .= "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";

        return $out;
    }
}
