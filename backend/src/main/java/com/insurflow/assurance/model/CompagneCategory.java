package com.insurflow.assurance.model;

import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Nested category inside a Compagne.
 * Equivalent of the categories array in compagneModel.js.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompagneCategory {
    private String name;
    private String indec;

    @Builder.Default
    private List<CompagneParameter> parameters = new ArrayList<>();
}
