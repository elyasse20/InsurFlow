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
     * Can also be invoked manually for testing.
     */
    public List<Notification> checkAndGenerateRenewalAlerts() {
        LocalDate today = LocalDate.now();
        List<Production> productions = productionRepository.findAll();
        List<Notification> createdNotifications = new ArrayList<>();

        for (Production prod : productions) {
            if (prod.getDateEff() == null || prod.getNumpolice() == null) {
                continue;
            }

            // Expiration date is 1 year after dateEff
            LocalDate expirationDate = prod.getDateEff().plusYears(1);
            long daysUntilExpiration = ChronoUnit.DAYS.between(today, expirationDate);

            NotificationType alertType = null;
            String message = null;

            if (daysUntilExpiration == 30 || (daysUntilExpiration > 15 && daysUntilExpiration <= 30)) {
                alertType = NotificationType.RENEWAL_30_DAYS;
                message = String.format("La police N° %s (%s) expire dans %d jours le %s.",
                        prod.getNumpolice(), prod.getClient(), daysUntilExpiration, expirationDate);
            } else if (daysUntilExpiration == 15 || (daysUntilExpiration > 0 && daysUntilExpiration <= 15)) {
                alertType = NotificationType.RENEWAL_15_DAYS;
                message = String.format("URGENT: La police N° %s (%s) expire dans %d jours le %s.",
                        prod.getNumpolice(), prod.getClient(), daysUntilExpiration, expirationDate);
            }

            if (alertType != null) {
                // Prevent duplicates for the same policy & type
                boolean exists = notificationRepository.existsByPolicyNumberAndType(prod.getNumpolice(), alertType);
                if (!exists) {
                    Notification notification = Notification.builder()
                            .policyNumber(prod.getNumpolice())
                            .clientName(prod.getClient())
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
            emailService.sendRenewalAlertEmail(createdNotifications);
        }

        return createdNotifications;
    }
}
