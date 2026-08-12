package com.insurflow.assurance.dto;

import lombok.Data;
import java.util.List;

/** Request DTO for POST/PUT /api/compagnes */
@Data
public class CompagneRequest {
    private String compagneName;
    private List<CompagneCategoryRequest> categories;

    @Data
    public static class CompagneCategoryRequest {
        private String name;
        private String indec;
        private List<CompagneParameterRequest> parameters;
    }

    @Data
    public static class CompagneParameterRequest {
        private String name;
        private double percent;
    }
}
