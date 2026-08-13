package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Maps to the 'invoices' collection in MongoDB.
 * Represents standard invoices (FAC), proforma quotes (PRF), and credit notes / avoirs (AVR).
 */
@Document(collection = "invoices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    @Id
    private String id;

    @Indexed(unique = true)
    private String invoiceNumber;

    @Indexed
    private String operationId;

    private String clientName;

    private String policyNumber;

    private String compagne;

    private String category;

    @Builder.Default
    private double amountHT = 0;

    @Builder.Default
    private double tvaRate = 14.0;

    @Builder.Default
    private double tvaAmount = 0;

    @Builder.Default
    private double amountTTC = 0;

    @Builder.Default
    private double paidAmount = 0;

    @Builder.Default
    private double remainingAmount = 0;

    @Builder.Default
    private InvoiceType type = InvoiceType.STANDARD;

    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.UNPAID;

    private LocalDate dueDate;

    private String notes;

    @CreatedDate
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
