package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Maps to the 'categories' collection. Equivalent of categoryModel.js. */
@Document(collection = "categories")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Category {
    @Id private String id;
    private String name;
    
    @Builder.Default
    private double commissionRate = 0.0;
}
