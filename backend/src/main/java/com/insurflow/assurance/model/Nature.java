package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Maps to the 'natures' collection. Equivalent of natureModel.js. */
@Document(collection = "natures")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Nature {
    @Id private String id;
    private String name;
}
