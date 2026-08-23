package com.insurflow.assurance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimAnalysisRequest {
    /** Raw accident narrative, constat amiable text, or police declaration */
    private String claimText;

    /** Associated policy / contract number */
    private String policyNumber;

    /** Name of the insured client */
    private String clientName;

    /** Date of the incident */
    private String incidentDate;

    /** Category (AUTO, HABITATION, RC, etc.) */
    private String category;

    /** Estimated total repair / damage costs (MAD) */
    private Double estimatedDamage;

    /** Applicable policy deductible / franchise (MAD) */
    private Double deductible;
}
