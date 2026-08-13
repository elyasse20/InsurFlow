package com.insurflow.assurance.scheduler;

import com.insurflow.assurance.model.Notification;
import com.insurflow.assurance.model.NotificationType;
import com.insurflow.assurance.model.Production;
import com.insurflow.assurance.repository.NotificationRepository;
import com.insurflow.assurance.repository.ProductionRepository;
import com.insurflow.assurance.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RenewalAlertScheduler {

    private final ProductionRepository productionRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    /**
     * Daily CRON job running at 08:00 AM.
     * Scans policies expiring in 30 days and 15 days.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void runScheduledRenewalAlerts() {
        log.info("Running daily CRON job for policy renewal alerts...");
        checkAndGenerateRenewalAlerts();
    }

    /**
     * Core logic to scan policies and generate non-duplicate notifications.
     * Includes strict null safety and exception handling to prevent runtime failures.
     */
    public List<Notification> checkAndGenerateRenewalAlerts() {
        List<Notification> createdNotifications = new ArrayList<>();
        try {
            LocalDate today = LocalDate.now();
            List<Production> productions = productionRepository.findAll();
            if (productions == null || productions.isEmpty()) {
                return Collections.emptyList();
            }

            for (Production prod : productions) {
                if (prod == null || prod.getDateEff() == null || prod.getNumpolice() == null || prod.getNumpolice().isBlank()) {
                    continue;
                }

                // Expiration date is 1 year after dateEff
                LocalDate expirationDate = prod.getDateEff().plusYears(1);
                long daysUntilExpiration = ChronoUnit.DAYS.between(today, expirationDate);

                NotificationType alertType = null;
                String message = null;
                String clientName = prod.getClient() != null ? prod.getClient() : "Client Inconnu";

                if (daysUntilExpiration == 30 || (daysUntilExpiration > 15 && daysUntilExpiration <= 30)) {
                    alertType = NotificationType.RENEWAL_30_DAYS;
                    message = String.format("La police N° %s (%s) expire dans %d jours le %s.",
                            prod.getNumpolice(), clientName, daysUntilExpiration, expirationDate);
                } else if (daysUntilExpiration == 15 || (daysUntilExpiration > 0 && daysUntilExpiration <= 15)) {
                    alertType = NotificationType.RENEWAL_15_DAYS;
                    message = String.format("URGENT: La police N° %s (%s) expire dans %d jours le %s.",
                            prod.getNumpolice(), clientName, daysUntilExpiration, expirationDate);
                }

                if (alertType != null) {
                    // Prevent duplicates for the same policy & type
                    boolean exists = notificationRepository.existsByPolicyNumberAndType(prod.getNumpolice(), alertType);
                    if (!exists) {
                        Notification notification = Notification.builder()
                                .policyNumber(prod.getNumpolice())
                                .clientName(clientName)
                                .expirationDate(expirationDate)
                                .message(message)
                                .type(alertType)
                                .isRead(false)
                                .createdAt(LocalDateTime.now())
                                .build();

                        Notification saved = notificationRepository.save(notification);
                        createdNotifications.add(saved);
                        log.info("✓ Created renewal notification: Policy {} -> {}", prod.getNumpolice(), alertType);
                    }
                }
            }

            if (!createdNotifications.isEmpty()) {
                try {
                    emailService.sendRenewalAlertEmail(createdNotifications);
                } catch (Exception ex) {
                    log.warn("Failed to send email alert: {}", ex.getMessage());
                }
            }
        } catch (Exception ex) {
            log.error("Error during renewal alert scheduler execution: ", ex);
        }

        return createdNotifications;
    }
}
