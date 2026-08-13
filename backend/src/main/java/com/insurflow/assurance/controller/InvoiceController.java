package com.insurflow.assurance.controller;

import com.insurflow.assurance.model.Invoice;
import com.insurflow.assurance.model.InvoiceStatus;
import com.insurflow.assurance.model.InvoiceType;
import com.insurflow.assurance.service.InvoicePdfService;
import com.insurflow.assurance.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
@Slf4j
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoicePdfService invoicePdfService;

    /**
     * GET /api/invoices — List all invoices with optional filtering (status, type, client).
     */
    @GetMapping
    public ResponseEntity<List<Invoice>> getInvoices(
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) InvoiceType type,
            @RequestParam(required = false) String client) {
        return ResponseEntity.ok(invoiceService.getInvoices(status, type, client));
    }

    /**
     * GET /api/invoices/{id} — Get details for a single invoice.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getById(@PathVariable String id) {
        return ResponseEntity.ok(invoiceService.getById(id));
    }

    /**
     * POST /api/invoices/generate/{operationId} — Automatically creates or retrieves invoice for an operation.
     */
    @PostMapping("/generate/{operationId}")
    public ResponseEntity<Invoice> generateForOperation(@PathVariable String operationId) {
        return ResponseEntity.ok(invoiceService.generateInvoiceForOperation(operationId));
    }

    /**
     * POST /api/invoices/proforma — Create a Proforma quote.
     */
    @PostMapping("/proforma")
    public ResponseEntity<Invoice> createProforma(@RequestBody Invoice proforma) {
        return ResponseEntity.ok(invoiceService.createProforma(proforma));
    }

    /**
     * POST /api/invoices/{id}/credit-note — Generates a Facture d'Avoir for canceled/modified operations.
     */
    @PostMapping("/{id}/credit-note")
    public ResponseEntity<Invoice> createCreditNote(@PathVariable String id) {
        return ResponseEntity.ok(invoiceService.createCreditNote(id));
    }

    /**
     * GET /api/invoices/{id}/pdf — Returns generated PDF byte stream for inline viewing or download.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable String id) {
        Invoice invoice = invoiceService.getById(id);
        byte[] pdfBytes = invoicePdfService.generateInvoicePdf(invoice);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", invoice.getInvoiceNumber() + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
