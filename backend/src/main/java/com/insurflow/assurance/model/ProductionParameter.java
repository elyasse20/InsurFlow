package com.insurflow.assurance.model;

import lombok.*;

/**
 * Embedded sub-document for a parameter row inside a Production.
 * Equivalent of the parameters array in productionModel.js.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionParameter {

    private String name;

    @Builder.Default
    private double primes = 0;

    @Builder.Default
    private double taxe = 0;

    @Builder.Default
    private double taxepara = 0;

    @Builder.Default
    private double accessoire = 0;

    @Builder.Default
    private double cnpc = 0;

    @Builder.Default
    private double commission = 0;
}
