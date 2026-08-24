package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Maps to the 'notifications' collection in MongoDB.
 * Represents automated system alerts and notifications across InsurFlow.
 */
@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    private String title;

    private String message;

    private NotificationType type;

    @Builder.Default
    private NotificationSeverity severity = NotificationSeverity.INFO;

    @Indexed
    private String referenceId;

    private String clientName;

    private Double amount;

    private String policyNumber;

    private LocalDate expirationDate;

    @Builder.Default
    private boolean isRead = false;

    @CreatedDate
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
