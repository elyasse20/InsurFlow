package com.insurflow.assurance.model;

import lombok.*;

/**
 * Embedded sub-document representing the percentage split of a premium
 * across multiple insurance companies (répartition).
 *
 * Used in Production.repartitions — equivalent of the REPARTITION columns
 * in the MARITIME A C sheet of the cahier des charges.
 *
 * Example: ATLANTA SANAD → 40%, RMA → 20%, AXA → 15%, SANLAM → 25%
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompagneRepartition {

    /** Name of the insurance company (CIE) */
    private String compagneName;

    /**
     * Percentage of the premium allocated to this company.
     * Stored as a plain percentage (e.g., 40.0 means 40%).
     */
    @Builder.Default
    private double percent = 0;
}
