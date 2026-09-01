package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Maps to the 'sinistres' collection in MongoDB.
 * Represents insurance claims, accident statements, and AI loss adjustment audits.
 */
@Document(collection = "sinistres")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sinistre {

    @Id
    private String id;

    @Indexed(unique = true)
    private String sinistreNumber; // e.g. SIN-2026-0001

    @Indexed
    private String clientName;

    @Indexed
    private String policyNumber;

    private String compagne;

    private String category;

    private LocalDate incidentDate;

    @Builder.Default
    private LocalDate declarationDate = LocalDate.now();

    private String claimText;

    @Builder.Default
    private SinistreStatus status = SinistreStatus.DECLARE;

    @Builder.Default
    private int fraudRiskScore = 0; // 0 to 100

    @Builder.Default
    private String fraudRiskLevel = "FAIBLE"; // FAIBLE, MOYEN, ÉLEVÉ

    private String liabilityAssessment;

    @Builder.Default
    private Integer liabilityRate = 0; // 0 (0% non responsable), 50 (50/50), 100 (100% responsable)

    @Builder.Default
    private double estimatedDamage = 0;

    @Builder.Default
    private double deductible = 0;

    @Builder.Default
    private double netPayout = 0;

    @Builder.Default
    private List<String> riskFlags = new ArrayList<>();

    @Builder.Default
    private List<String> recommendedActions = new ArrayList<>();

    private String executiveSummary;

    private String notes;

    @CreatedDate
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum SinistreStatus {
        DECLARE,
        EN_EXPERTISE,
        INDEMNISE,
        CLOTURE,
        REFUSE
    }
}
