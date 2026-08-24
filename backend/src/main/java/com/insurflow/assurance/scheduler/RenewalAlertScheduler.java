package com.insurflow.assurance.scheduler;

import com.insurflow.assurance.model.Notification;
import com.insurflow.assurance.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RenewalAlertScheduler {

    private final NotificationService notificationService;

    /**
     * Daily CRON job running at 08:00 AM.
     * Evaluates expiring policies, overdue quittances, and claims alerts.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void runScheduledRenewalAlerts() {
        log.info("Running daily automated notification & alert scan...");
        checkAndGenerateRenewalAlerts();
    }

    /**
     * Triggers dynamic notification and alert generation.
     */
    public List<Notification> checkAndGenerateRenewalAlerts() {
        return notificationService.generateAutomatedAlerts();
    }
}
