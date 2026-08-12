package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Maps to the 'tvas' collection. Equivalent of TvaModel.js. */
@Document(collection = "tvas")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Tva {
    @Id private String id;
    private String name;
    private double rate;
}
