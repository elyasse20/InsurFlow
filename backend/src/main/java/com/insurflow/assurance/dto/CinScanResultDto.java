package com.insurflow.assurance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO returned by the AI CIN OCR Scanner service.
 * expiry is the card validity date (Valable jusqu'au) — not stored on the client
 * but returned to the frontend so it can be shown as informational context.
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
    /** Date of birth  — Né(e) le … */
    private String dateNaissance;
    /** Card expiry date — Valable jusqu'au … (informational only) */
    @Builder.Default
    private String expiry = "";
    @Builder.Default
    private double confidence = 0.0;
}
