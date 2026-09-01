package com.insurflow.assurance.service;

import com.insurflow.assurance.model.*;
import com.insurflow.assurance.repository.InvoiceRepository;
import com.insurflow.assurance.repository.ProductionRepository;
import com.insurflow.assurance.repository.ReglementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ProductionRepository productionRepository;
    private final ReglementRepository reglementRepository;

    /**
     * Automatically generates a Standard Invoice for a given Operation/Production.
     */
    public Invoice generateInvoiceForOperation(String operationId) {
        Optional<Invoice> existing = invoiceRepository.findByOperationIdAndType(operationId, InvoiceType.STANDARD);
        if (existing.isPresent()) {
            return existing.get();
        }

        Production prod = productionRepository.findById(operationId)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found with ID: " + operationId));

        // Fetch matching settlement if available
        Optional<Reglement> reglementOpt = reglementRepository.findAll().stream()
                .filter(r -> r.getProduction() != null && r.getProduction().getId().equals(operationId))
                .findFirst();

        double totalTTC = prod.getMontantTotal();
        double tvaRate = prod.getTvaRate() > 0 ? prod.getTvaRate() : 14.0;
        double amountHT = Math.round((totalTTC / (1 + (tvaRate / 100.0))) * 100.0) / 100.0;
        double tvaAmount = Math.round((totalTTC - amountHT) * 100.0) / 100.0;

        double paidAmount = 0;
        InvoiceStatus status = InvoiceStatus.UNPAID;

        if (reglementOpt.isPresent()) {
            Reglement reg = reglementOpt.get();
            paidAmount = reg.getTotalPaiements();
            if (reg.getStatus() == Reglement.ReglementStatus.PAYE) {
                status = InvoiceStatus.PAID;
            } else if (reg.getStatus() == Reglement.ReglementStatus.PARTIEL) {
                status = InvoiceStatus.PARTIAL;
            }
        }

        double remaining = Math.max(0, totalTTC - paidAmount);
        long count = invoiceRepository.countByType(InvoiceType.STANDARD) + 1;
        String invoiceNumber = String.format("FAC-2026-%04d", count);

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .operationId(operationId)
                .clientName(prod.getClient() != null ? prod.getClient() : "Client Inconnu")
                .policyNumber(prod.getNumpolice())
                .compagne(prod.getCompagne())
                .category(prod.getCategory())
                .amountHT(amountHT)
                .tvaRate(tvaRate)
                .tvaAmount(tvaAmount)
                .amountTTC(totalTTC)
                .paidAmount(paidAmount)
                .remainingAmount(remaining)
                .type(InvoiceType.STANDARD)
                .status(status)
                .dueDate(prod.getDateEff() != null ? prod.getDateEff().plusDays(30) : LocalDate.now().plusDays(30))
                .createdAt(LocalDateTime.now())
                .build();

        return invoiceRepository.save(invoice);
    }

    /**
     * Creates a Credit Note (Facture d'Avoir) for an existing invoice/operation.
     */
    public Invoice createCreditNote(String invoiceId) {
        Invoice original = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

        // Prevent duplicate credit note creation for the same invoice
        Optional<Invoice> existingAvoir = invoiceRepository.findByTypeOrderByCreatedAtDesc(InvoiceType.AVOIR).stream()
                .filter(a -> (a.getNotes() != null && a.getNotes().contains(original.getInvoiceNumber())) ||
                             (original.getOperationId() != null && !original.getOperationId().isBlank() && original.getOperationId().equals(a.getOperationId())))
                .findFirst();
        if (existingAvoir.isPresent()) {
            log.info("Credit note already exists for invoice {}: {}", original.getInvoiceNumber(), existingAvoir.get().getInvoiceNumber());
            return existingAvoir.get();
        }

        long count = invoiceRepository.countByType(InvoiceType.AVOIR) + 1;
        String avoirNumber = String.format("AVR-2026-%04d", count);

        Invoice creditNote = Invoice.builder()
                .invoiceNumber(avoirNumber)
                .operationId(original.getOperationId())
                .clientName(original.getClientName())
                .policyNumber(original.getPolicyNumber())
                .compagne(original.getCompagne())
                .category(original.getCategory())
                .amountHT(-Math.abs(original.getAmountHT()))
                .tvaRate(original.getTvaRate())
                .tvaAmount(-Math.abs(original.getTvaAmount()))
                .amountTTC(-Math.abs(original.getAmountTTC()))
                .paidAmount(0)
                .remainingAmount(0)
                .type(InvoiceType.AVOIR)
                .status(InvoiceStatus.PAID)
                .notes("Facture d'Avoir annulant la facture " + original.getInvoiceNumber())
                .createdAt(LocalDateTime.now())
                .build();

        // Update original invoice notes to reflect regularization
        String noteSuffix = "Régularisée par l'avoir " + avoirNumber;
        if (original.getNotes() == null || original.getNotes().isBlank()) {
            original.setNotes(noteSuffix);
        } else if (!original.getNotes().contains("Régularisée")) {
            original.setNotes(original.getNotes() + " | " + noteSuffix);
        }
        original.setRemainingAmount(0);
        invoiceRepository.save(original);

        return invoiceRepository.save(creditNote);
    }

    /**
     * Creates a Proforma quote.
     */
    public Invoice createProforma(Invoice proformaRequest) {
        long count = invoiceRepository.countByType(InvoiceType.PROFORMA) + 1;
        String proformaNumber = String.format("PRF-2026-%04d", count);

        double totalTTC = proformaRequest.getAmountTTC();
        double tvaRate = proformaRequest.getTvaRate() > 0 ? proformaRequest.getTvaRate() : 14.0;
        double amountHT = Math.round((totalTTC / (1 + (tvaRate / 100.0))) * 100.0) / 100.0;
        double tvaAmount = Math.round((totalTTC - amountHT) * 100.0) / 100.0;

        proformaRequest.setInvoiceNumber(proformaNumber);
        proformaRequest.setType(InvoiceType.PROFORMA);
        proformaRequest.setStatus(InvoiceStatus.UNPAID);
        proformaRequest.setAmountHT(amountHT);
        proformaRequest.setTvaAmount(tvaAmount);
        proformaRequest.setRemainingAmount(totalTTC);
        proformaRequest.setCreatedAt(LocalDateTime.now());

        return invoiceRepository.save(proformaRequest);
    }

    /**
     * Retrieves all invoices with optional filtering.
     */
    public List<Invoice> getInvoices(InvoiceStatus status, InvoiceType type, String clientName) {
        if (status != null) {
            return invoiceRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        if (type != null) {
            return invoiceRepository.findByTypeOrderByCreatedAtDesc(type);
        }
        if (clientName != null && !clientName.isBlank()) {
            return invoiceRepository.findByClientNameContainingIgnoreCaseOrderByCreatedAtDesc(clientName);
        }
        return invoiceRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Fetches invoice by ID.
     */
    public Invoice getById(String id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));
    }
}
