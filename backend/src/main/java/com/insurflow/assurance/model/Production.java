package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Maps to the 'productions' collection.
 * Equivalent of productionModel.js.
 *
 * The 'montantTotal' virtual is implemented as a @Transient computed method.
 */
@Document(collection = "productions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Production {

    @Id
    private String id;

    private String natureOperation;

    @Indexed
    private String client;

    private LocalDate dateEff;
    private String moisDem;
    private String compagne;

    @Builder.Default
    private double tvaRate = 0;

    private String category;

    @Indexed
    @Field("numpolice")
    private String numpolice;

    // Specific fields for MARITIME category (from Specifications)
    private String refCie;
    private String certificat;
    private String navire;

    /**
     * N° d'Ordre interne — appears as the 'ORDRE' column in the MARITIME sheet.
     * This is distinct from numpolice (which maps to 'POLICE' column).
     * Example: '74278', '30469'
     */
    private String ordre;

    /**
     * Répartition du montant entre plusieurs compagnies d'assurance.
     * Used in MARITIME A C: ATLANTA SANAD → 40%, RMA → 20%, etc.
     */
    @Builder.Default
    private List<CompagneRepartition> repartitions = new ArrayList<>();

    @Builder.Default
    private List<ProductionParameter> parameters = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Virtual total — equivalent to productionSchema.virtual('montantTotal').
     * Not persisted to MongoDB.
     */
    @org.springframework.data.annotation.Transient
    public double getMontantTotal() {
        if (parameters == null || parameters.isEmpty()) return 0;
        return parameters.stream().mapToDouble(p ->
            p.getPrimes() + p.getTaxe() + p.getTaxepara() + p.getAccessoire() + p.getCnpc()
        ).sum();
    }

    /**
     * Virtual exercice (year) derived from moisDem (e.g. "2026-01" -> 2026)
     * or dateEff year or createdAt year. Not persisted to MongoDB.
     */
    @org.springframework.data.annotation.Transient
    public Integer getExercice() {
        if (dateEff != null) {
            return dateEff.getYear();
        }
        if (moisDem != null && moisDem.length() >= 4) {
            try {
                return Integer.parseInt(moisDem.substring(0, 4));
            } catch (NumberFormatException ignored) {}
        }
        if (createdAt != null) {
            return createdAt.getYear();
        }
        return null;
    }
}
