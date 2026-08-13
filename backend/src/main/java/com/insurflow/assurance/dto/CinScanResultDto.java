package com.insurflow.assurance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO returned by the AI CIN OCR Scanner service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinScanResultDto {

    private String cin;
    private String nom;
    private String prenom;
    private String adresse;
    private String dateNaissance;
    @Builder.Default
    private double confidence = 0.92;
}
