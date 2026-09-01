package com.insurflow.assurance.dto;

import com.insurflow.assurance.model.Sinistre.SinistreStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SinistreRequest {
    private String sinistreNumber;
    private String clientName;
    private String policyNumber;
    private String compagne;
    private String category;
    private LocalDate incidentDate;
    private LocalDate declarationDate;
    private String claimText;
    private SinistreStatus status;
    private Integer fraudRiskScore;
    private String fraudRiskLevel;
    private String liabilityAssessment;
    private Integer liabilityRate;
    private Double estimatedDamage;
    private Double deductible;
    private Double netPayout;
    private List<String> riskFlags;
    private List<String> recommendedActions;
    private String executiveSummary;
    private String notes;
}
