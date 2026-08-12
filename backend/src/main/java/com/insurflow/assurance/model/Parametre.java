package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Maps to the 'parametres' collection. Equivalent of parametreModel.js. */
@Document(collection = "parametres")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Parametre {
    @Id private String id;
    private String name; // Key
    private String value;
    private String type; // e.g. "text" | "number" | "boolean"
}
