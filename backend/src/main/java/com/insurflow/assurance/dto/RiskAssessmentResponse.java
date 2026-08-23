package com.insurflow.assurance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAssessmentResponse {
    /** LOW, MEDIUM, or HIGH */
    private String riskLevel;
    
    /** 0 to 100 score */
    private int riskScore;
    
    /** Underwriting and risk evaluation summary */
    private String summary;
    
    /** Specific pricing / tariff adjustments advice */
    private String pricingRecommendation;
    
    /** Recommended insurance guarantees */
    private List<String> recommendedGuarantees;
    
    /** Key risk positive/negative flags */
    private List<String> flags;
}
