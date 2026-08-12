package com.insurflow.assurance.model;

import lombok.*;

/**
 * Nested parameter inside a CompagneCategory.
 * Equivalent of the inner parameters array in compagneModel.js.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompagneParameter {
    private String name;
    private double percent;
}
