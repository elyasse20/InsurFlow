package com.insurflow.assurance.controller;

import com.insurflow.assurance.model.Notification;
import com.insurflow.assurance.repository.NotificationRepository;
import com.insurflow.assurance.scheduler.RenewalAlertScheduler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final RenewalAlertScheduler renewalAlertScheduler;

    /**
     * GET /api/notifications — Fetch all unread notifications (or all if unreadOnly=false).
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(defaultValue = "true") boolean unreadOnly) {
        List<Notification> notifications = unreadOnly
                ? notificationRepository.findByIsReadFalseOrderByCreatedAtDesc()
                : notificationRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/notifications/count — Get count of unread notifications.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        long count = notificationRepository.countByIsReadFalse();
        return ResponseEntity.ok(Map.of("count", count, "unreadCount", count));
    }

    /**
     * PATCH /api/notifications/{id}/read — Mark a single notification as read.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        return notificationRepository.findById(id)
                .map(n -> {
                    n.setRead(true);
                    return ResponseEntity.ok(notificationRepository.save(n));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/notifications/read-all — Mark all notifications as read.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        List<Notification> unread = notificationRepository.findByIsReadFalseOrderByCreatedAtDesc();
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    /**
     * POST /api/notifications/trigger-check — Manually run renewal alert scan for testing.
     */
    @PostMapping("/trigger-check")
    public ResponseEntity<Map<String, Object>> triggerAlertCheck() {
        List<Notification> newAlerts = renewalAlertScheduler.checkAndGenerateRenewalAlerts();
        return ResponseEntity.ok(Map.of(
                "message", "Renewal alert check executed successfully",
                "newNotificationsCount", newAlerts.size(),
                "notifications", newAlerts
        ));
    }
}
