package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * Maps to the 'compagnes' collection.
 * Equivalent of compagneModel.js.
 */
@Document(collection = "compagnes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Compagne {

    @Id
    private String id;

    private String compagneName;

    @Builder.Default
    private List<CompagneCategory> categories = new ArrayList<>();
}
