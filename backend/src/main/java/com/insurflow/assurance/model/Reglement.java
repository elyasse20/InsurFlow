package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Maps to the 'regelements' collection.
 * Equivalent of RegelementModel.js.
 *
 * The Mongoose pre('save') hook for status auto-update is handled
 * in ReglementService.updateStatus() before every save.
 *
 * The virtual 'totalPaiements' is a @Transient computed method.
 */
@Document(collection = "regelements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reglement {

    @Id
    private String id;

    @DBRef
    private Production production;

    // Denormalized fields — mirrors production for easy display / export
    private String natureOperation;
    private String client;
    private LocalDate dateEff;
    private String moisDem;
    private String compagne;
    private String category;
    private String numpolice;

    @Builder.Default
    private double montantTotal = 0;

    /**
     * N° Facture — invoice number associated with this settlement.
     * Appears as the 'N°FACTURE' column in PROD A C and MARITIME A C sheets.
     */
    private String numFacture;

    /**
     * Paiements reçus du client (ce que l'agence encaisse).
     * Maps to 'REGLER PAR LE CLIENT' in the cahier des charges.
     */
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

    /**
     * Paiements versés à la compagnie d'assurance (ce que l'agence reverse).
     * Maps to 'REGLER A LA CIE' in the cahier des charges.
     */
    @Builder.Default
    private List<Payment> paymentscie = new ArrayList<>();

    @Builder.Default
    private ReglementStatus status = ReglementStatus.EN_ATTENTE;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Virtual — total of client payments. Not persisted to MongoDB.
     */
    @org.springframework.data.annotation.Transient
    public double getTotalPaiements() {
        if (payments == null || payments.isEmpty()) return 0;
        return payments.stream().mapToDouble(Payment::getMontant).sum();
    }

    /**
     * Virtual — total of payments made to the insurance company (CIE).
     * Not persisted to MongoDB.
     */
    @org.springframework.data.annotation.Transient
    public double getTotalPaiementsCie() {
        if (paymentscie == null || paymentscie.isEmpty()) return 0;
        return paymentscie.stream().mapToDouble(Payment::getMontant).sum();
    }

    /**
     * Virtual exercice (year) derived from moisDem or dateEff or createdAt or production.
     */
    @org.springframework.data.annotation.Transient
    public Integer getExercice() {
        if (moisDem != null && moisDem.length() >= 4) {
            try {
                return Integer.parseInt(moisDem.substring(0, 4));
            } catch (NumberFormatException ignored) {}
        }
        if (dateEff != null) {
            return dateEff.getYear();
        }
        if (production != null && production.getExercice() != null) {
            return production.getExercice();
        }
        if (createdAt != null) {
            return createdAt.getYear();
        }
        return null;
    }

    public enum ReglementStatus {
        EN_ATTENTE, PARTIEL, PAYE
    }
}
