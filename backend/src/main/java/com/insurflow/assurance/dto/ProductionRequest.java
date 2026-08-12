package com.insurflow.assurance.dto;

import lombok.Data;
import java.util.List;

/** Request DTO for POST /api/productions and PUT /api/productions/:id */
@Data
public class ProductionRequest {
    private String natureOperation;
    private String client;
    private String dateEff;       // ISO date string: "2024-01-15"
    private String moisDem;
    private String compagne;
    private double tvaRate;
    private String category;
    private String numpolice;
    
    // Specific fields for MARITIME category (from Specifications)
    private String refCie;
    private String certificat;
    private String navire;

    /** N° d'Ordre interne (MARITIME sheet, 'ORDRE' column), distinct from numpolice */
    private String ordre;

    /** Répartition du montant entre compagnies (MARITIME A C: REPARTITION columns) */
    private List<RepartitionRequest> repartitions;

    private List<ProductionParameterRequest> parameters;

    @Data
    public static class ProductionParameterRequest {
        private String name;
        private double primes;
        private double taxe;
        private double taxepara;
        private double accessoire;
        private double cnpc;
        private double commission;
    }

    @Data
    public static class RepartitionRequest {
        private String compagneName;
        private double percent;
    }
}
