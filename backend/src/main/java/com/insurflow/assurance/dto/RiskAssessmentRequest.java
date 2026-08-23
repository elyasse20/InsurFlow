package com.insurflow.assurance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAssessmentRequest {
    private String clientName;
    private Integer clientAge;
    private String vehicleType;
    private Double annualMileage;
    private Double clientCreditBudget;
    private Integer historyClaimsCount;
    private String usageType;
    private String category;
    private String natureOperation;
}
