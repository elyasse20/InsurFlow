package com.insurflow.assurance.model;

import lombok.*;

import java.time.LocalDate;

/**
 * Embedded payment sub-document inside a Reglement.
 * Equivalent of paymentSchema in RegelementModel.js.
 * Note: _id: false in Mongoose → no separate @Id here (it's embedded).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    public enum PaymentMode {
        CHEQUE, ESPECE, VIREMENT, AUTRE
    }

    private PaymentMode mode;

    @Builder.Default
    private double montant = 0;

    // CHEQUE / EFFET
    private LocalDate dateEcheance;
    private String banque;
    private String numero;
    private String emporteur;

    // VIREMENT
    private LocalDate dateVirement;

    // Document path / URL
    private String doc;

    private String commentaire;
}
