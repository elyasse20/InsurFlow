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
public class ClaimAnalysisResponse {
    /** Structured executive summary of the accident/claim */
    private String executiveSummary;

    /** Legal & ACAPS liability assessment / fault split (e.g. 0%, 50/50, 100%) */
    private String liabilityAssessment;

    /** Financial payout & deductible calculations */
    private FinancialBreakdownDto financialBreakdown;

    /** Fraud / anomaly risk score (0 to 100, where higher indicates higher risk) */
    private int fraudRiskScore;

    /** Fraud Risk Category: FAIBLE, MOYEN, or ÉLEVÉ */
    private String fraudRiskLevel;

    /** Specific anomaly flags & risk indicators identified */
    private List<String> riskFlags;

    /** Prescriptive action steps for the insurance broker / claims handler */
    private List<String> recommendedActions;
}
