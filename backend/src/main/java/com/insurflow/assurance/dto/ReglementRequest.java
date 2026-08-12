package com.insurflow.assurance.dto;

import lombok.Data;
import java.util.List;

/**
 * Request DTO for POST /api/regelements/:productionId/paiement.
 * Mirrors createOrUpdateRegelementPaiement in regelementController.js.
 */
@Data
public class ReglementRequest {
    private String client;
    private String natureOperation;
    private String dateEff;
    private String moisDem;
    private String compagne;
    private String category;
    private String numpolice;
    private double montantTotal;

    /** N° Facture — invoice reference (N°FACTURE column in PROD A C / MARITIME A C) */
    private String numFacture;

    /** Paiements reçus du client (REGLER PAR LE CLIENT) */
    private List<PaymentRequest> payments;

    /** Paiements versés à la compagnie (REGLER A LA CIE) */
    private List<PaymentRequest> paymentscie;
}

