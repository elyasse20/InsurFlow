package com.insurflow.assurance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialBreakdownDto {
    /** Gross estimated repair / compensation amount (MAD) */
    private Double estimatedDamage;

    /** Deductible / Franchise amount deducted (MAD) */
    private Double deductible;

    /** Net compensation payout to the insured (MAD) */
    private Double netPayout;

    /** Currency (default: MAD) */
    private String currency;

    /** Specific financial / deductible notes */
    private String notes;
}
