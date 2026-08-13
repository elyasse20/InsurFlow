package com.insurflow.assurance.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Maps to the 'notifications' collection in MongoDB.
 * Represents policy renewal alerts and system notifications.
 */
@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    private String policyNumber;

    private String clientName;

    private LocalDate expirationDate;

    private String message;

    private NotificationType type;

    @Builder.Default
    private boolean isRead = false;

    @CreatedDate
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
