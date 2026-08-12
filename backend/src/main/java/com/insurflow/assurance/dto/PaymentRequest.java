package com.insurflow.assurance.dto;

import com.insurflow.assurance.model.Payment.PaymentMode;
import lombok.Data;

/** Single payment entry — equivalent of paymentSchema fields in RegelementModel.js */
@Data
public class PaymentRequest {
    private PaymentMode mode;
    private double montant;
    private String dateEcheance;    // ISO date string
    private String banque;
    private String numero;
    private String emporteur;
    private String dateVirement;    // ISO date string
    private String commentaire;
    // 'doc' file path is set by FileStorageService after upload
    private String doc;
}
