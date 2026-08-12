package com.insurflow.assurance.dto;

import com.insurflow.assurance.model.Client.ClientType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Request DTO for POST /api/clients and PUT /api/clients/:id.
 * Used for both multipart/form-data (the file is handled separately as MultipartFile).
 * Mirrors the body parsing in addClient / updateClient in clientController.js.
 */
@Data
public class ClientRequest {

    @NotNull
    private ClientType type;

    @NotBlank
    private String nom;

    private String prenom;      // required if type = particulier
    private String cin;         // required if type = particulier

    @NotBlank
    private String tel;

    @NotBlank
    private String adresse;

    @Pattern(regexp = "^$|^\\d{15}$", message = "L'ICE doit comporter exactement 15 chiffres numériques")
    private String ice;                 // required if type = societe (15 digits)

    private String identifiantFiscal;   // maps to 'if' in MongoDB
    private String rc;                  // required if type = societe

    @Min(value = 0, message = "Le budget ne peut pas être négatif")
    private double budget;

    @Min(value = 0, message = "Le crédit ne peut pas être négatif")
    private double credit;
}
