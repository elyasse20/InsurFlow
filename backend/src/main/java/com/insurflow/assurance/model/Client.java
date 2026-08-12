package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

/**
 * Maps to the 'clients' collection.
 * Equivalent of clientModel.js (Mongoose schema).
 *
 * NOTE: The field 'if' (Identifiant Fiscal) in MongoDB is stored as 'if'
 *       but Java reserves that keyword — we use 'identifiantFiscal'
 *       and map it with @Field("if").
 */
@Document(collection = "clients")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Client {

    @Id
    private String id;

    private ClientType type;

    /** Required when type = PARTICULIER */
    private String cin;

    @Indexed
    private String nom;

    /** Required when type = PARTICULIER */
    private String prenom;

    private String tel;
    private String adresse;

    /** Stored filename / path of the uploaded document */
    private String doc;

    /* ─── SOCIETE fields ─── */

    /** ICE — must be 15 digits. Required when type = SOCIETE */
    private String ice;

    /** Identifiant Fiscal. Stored in MongoDB as 'if' — Java keyword workaround */
    @Field("if")
    private String identifiantFiscal;

    /** RC — Registre de Commerce. Required when type = SOCIETE */
    private String rc;

    /* ─── Financials ─── */

    @Builder.Default
    private LocalDateTime dateDebut = LocalDateTime.now();

    @Builder.Default
    private double budget = 0;

    @Builder.Default
    private double credit = 0;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ClientType {
        particulier, societe
    }
}
