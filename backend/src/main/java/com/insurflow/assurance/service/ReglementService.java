package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.PaymentRequest;
import com.insurflow.assurance.dto.ReglementRequest;
import com.insurflow.assurance.exception.ResourceNotFoundException;
import com.insurflow.assurance.model.*;
import com.insurflow.assurance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for règlements (payment records).
 * Equivalent of regelementController.js, including:
 *  - createOrUpdateRegelementPaiement
 *  - status auto-update (replaces Mongoose pre('save') hook)
 *  - client credit update
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReglementService {

    private final ReglementRepository reglementRepository;
    private final ProductionRepository productionRepository;
    private final ClientRepository clientRepository;
    private final FileStorageService fileStorageService;

    /** GET /api/regelements — optionally filtered by client */
    public List<Reglement> getAll(String client) {
        if (client != null && !client.isBlank()) {
            return reglementRepository.findByClientRegex("^" + client.trim() + "$");
        }
        return reglementRepository.findAll();
    }

    /** GET /api/regelements/all (unfiltered) */
    public List<Reglement> getAllRaw() {
        return reglementRepository.findAll();
    }

    /** GET /api/regelements/:productionId */
    public Reglement getByProduction(String productionId) {
        return reglementRepository.findByProductionId(productionId)
                .orElseThrow(() -> new ResourceNotFoundException("Règlement introuvable"));
    }

    /**
     * POST /api/regelements/:productionId/paiement
     * Equivalent of createOrUpdateRegelementPaiement in regelementController.js.
     */
    public Reglement createOrUpdatePaiement(String productionId,
                                            ReglementRequest req,
                                            List<MultipartFile> files) throws IOException {
        // 1. Verify production exists
        Production production = productionRepository.findById(productionId)
                .orElseThrow(() -> new ResourceNotFoundException("Production (opération) introuvable"));

        // 2. Parse client payments
        List<Payment> newPayments = parsePayments(req.getPayments(), files);

        // 2b. Parse CIE payments early (needed for validation)
        List<Payment> newPaymentsCie = parsePayments(req.getPaymentscie(), null);

        // 3. Validate at least one payment (client OR CIE) with montant > 0
        double totalNewPayments = newPayments.stream().mapToDouble(Payment::getMontant).sum();
        double totalNewPaymentsCie = newPaymentsCie.stream().mapToDouble(Payment::getMontant).sum();
        if (totalNewPayments <= 0 && totalNewPaymentsCie <= 0) {
            throw new IllegalArgumentException("Au moins un montant de paiement (client ou CIE) est requis");
        }


        // 4. Get existing reglement to track credit delta
        Reglement existing = reglementRepository.findByProductionId(productionId).orElse(null);

        double oldTotalPaid = existing != null
                ? existing.getPayments().stream().mapToDouble(Payment::getMontant).sum()
                : 0;
        double newPaymentAmount = Math.max(totalNewPayments - oldTotalPaid, 0);

        // 5. Merge client payments
        List<Payment> allPayments = new ArrayList<>();
        if (existing != null && existing.getPayments() != null) {
            allPayments.addAll(existing.getPayments());
        }
        allPayments.addAll(newPayments);

        // 6. Merge CIE payments (already parsed in step 2b)
        List<Payment> allPaymentsCie = new ArrayList<>();
        if (existing != null && existing.getPaymentscie() != null) {
            allPaymentsCie.addAll(existing.getPaymentscie());
        }
        allPaymentsCie.addAll(newPaymentsCie);


        // 7. Build / update the reglement
        Reglement reglement = existing != null ? existing : new Reglement();
        reglement.setProduction(production);
        reglement.setNatureOperation(coalesce(req.getNatureOperation(), production.getNatureOperation()));
        reglement.setClient(coalesce(req.getClient(), production.getClient()));
        reglement.setDateEff(req.getDateEff() != null ? LocalDate.parse(req.getDateEff()) : production.getDateEff());
        reglement.setMoisDem(coalesce(req.getMoisDem(), production.getMoisDem()));
        reglement.setCompagne(coalesce(req.getCompagne(), production.getCompagne()));
        reglement.setCategory(coalesce(req.getCategory(), production.getCategory()));
        reglement.setNumpolice(coalesce(req.getNumpolice(), production.getNumpolice()));
        reglement.setMontantTotal(req.getMontantTotal());
        reglement.setNumFacture(req.getNumFacture());
        reglement.setPayments(allPayments);
        reglement.setPaymentscie(allPaymentsCie);

        // 8. Auto-update status (replaces Mongoose pre('save') hook)
        updateStatus(reglement);

        Reglement saved = reglementRepository.save(reglement);

        // 9. Update client credit (only for genuinely new CLIENT payment amounts)
        if (newPaymentAmount > 0 && req.getClient() != null) {
            updateClientCredit(req.getClient(), newPaymentAmount);
        }

        return saved;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Mirrors parsePaymentsFromRequest in regelementController.js.
     * Each PaymentRequest already has its fields parsed; we just need to handle file uploads.
     */
    private List<Payment> parsePayments(List<PaymentRequest> dtos,
                                         List<MultipartFile> files) throws IOException {
        if (dtos == null) return new ArrayList<>();

        List<Payment> payments = new ArrayList<>();
        for (int i = 0; i < dtos.size(); i++) {
            PaymentRequest dto = dtos.get(i);
            Payment p = Payment.builder()
                    .mode(dto.getMode())
                    .montant(dto.getMontant())
                    .dateEcheance(dto.getDateEcheance() != null ? LocalDate.parse(dto.getDateEcheance()) : null)
                    .banque(dto.getBanque())
                    .numero(dto.getNumero())
                    .emporteur(dto.getEmporteur())
                    .dateVirement(dto.getDateVirement() != null ? LocalDate.parse(dto.getDateVirement()) : null)
                    .commentaire(dto.getCommentaire())
                    .build();

            // Handle file if provided at matching index
            if (files != null && i < files.size() && !files.get(i).isEmpty()) {
                p.setDoc(fileStorageService.store(files.get(i), "regelements"));
            } else if (dto.getDoc() != null) {
                p.setDoc(dto.getDoc());
            }

            payments.add(p);
        }
        return payments;
    }

    /**
     * Equivalent of the pre('save') hook in RegelementModel.js.
     * Called before every save.
     */
    private void updateStatus(Reglement reglement) {
        double total = reglement.getMontantTotal();
        double paid = reglement.getTotalPaiements();

        if (paid <= 0) {
            reglement.setStatus(Reglement.ReglementStatus.EN_ATTENTE);
        } else if (paid < total) {
            reglement.setStatus(Reglement.ReglementStatus.PARTIEL);
        } else {
            reglement.setStatus(Reglement.ReglementStatus.PAYE);
        }
    }

    /** Mirrors the client credit update in createOrUpdateRegelementPaiement */
    private void updateClientCredit(String clientName, double paymentAmount) {
        try {
            List<com.insurflow.assurance.model.Client> clients =
                    clientRepository.findByNomRegexOrderByNomAsc("^" + clientName.trim() + "$");

            if (!clients.isEmpty()) {
                com.insurflow.assurance.model.Client client = clients.get(0);
                double previousCredit = client.getCredit();
                client.setCredit(Math.max(0, client.getCredit() - paymentAmount));
                clientRepository.save(client);
                log.info("✔ Crédit mis à jour: \"{}\" | Avant: {} DH | Après: {} DH",
                        client.getNom(), previousCredit, client.getCredit());
            } else {
                log.warn("⚠ Client \"{}\" non trouvé - crédit non mis à jour", clientName);
            }
        } catch (Exception e) {
            log.error("Error updating client credit: {}", e.getMessage());
        }
    }

    private <T> T coalesce(T value, T fallback) {
        return value != null ? value : fallback;
    }
}
