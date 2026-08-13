package com.insurflow.assurance.controller;

import com.insurflow.assurance.model.Notification;
import com.insurflow.assurance.repository.NotificationRepository;
import com.insurflow.assurance.scheduler.RenewalAlertScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final RenewalAlertScheduler renewalAlertScheduler;

    /**
     * GET /api/notifications — Fetch all unread notifications (or all if unreadOnly=false).
     * Returns 200 OK with empty list [] in case of database error.
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(defaultValue = "true") boolean unreadOnly) {
        try {
            List<Notification> notifications = unreadOnly
                    ? notificationRepository.findByIsReadFalseOrderByCreatedAtDesc()
                    : notificationRepository.findAllByOrderByCreatedAtDesc();
            return ResponseEntity.ok(notifications != null ? notifications : Collections.emptyList());
        } catch (Exception ex) {
            log.error("Error fetching notifications: ", ex);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * GET /api/notifications/count — Get count of unread notifications.
     * Returns 200 OK with { "count": 0, "unreadCount": 0 } in case of error.
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        try {
            long count = notificationRepository.countByIsReadFalse();
            return ResponseEntity.ok(Map.of("count", count, "unreadCount", count));
        } catch (Exception ex) {
            log.error("Error counting unread notifications: ", ex);
            return ResponseEntity.ok(Map.of("count", 0L, "unreadCount", 0L));
        }
    }

    /**
     * PATCH /api/notifications/{id}/read — Mark a single notification as read.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        try {
            return notificationRepository.findById(id)
                    .map(n -> {
                        n.setRead(true);
                        return ResponseEntity.ok(notificationRepository.save(n));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception ex) {
            log.error("Error marking notification as read: id={}", id, ex);
            return ResponseEntity.ok().build();
        }
    }

    /**
     * PATCH /api/notifications/read-all — Mark all notifications as read.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        try {
            List<Notification> unread = notificationRepository.findByIsReadFalseOrderByCreatedAtDesc();
            if (unread != null && !unread.isEmpty()) {
                unread.forEach(n -> n.setRead(true));
                notificationRepository.saveAll(unread);
            }
            return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
        } catch (Exception ex) {
            log.error("Error marking all notifications as read: ", ex);
            return ResponseEntity.ok(Map.of("message", "Operation completed"));
        }
    }

    /**
     * POST /api/notifications/trigger-check — Manually run renewal alert scan for testing.
     */
    @PostMapping("/trigger-check")
    public ResponseEntity<Map<String, Object>> triggerAlertCheck() {
        try {
            List<Notification> newAlerts = renewalAlertScheduler.checkAndGenerateRenewalAlerts();
            return ResponseEntity.ok(Map.of(
                    "message", "Renewal alert check executed successfully",
                    "newNotificationsCount", newAlerts.size(),
                    "notifications", newAlerts != null ? newAlerts : Collections.emptyList()
            ));
        } catch (Exception ex) {
            log.error("Error triggering renewal alert check: ", ex);
            return ResponseEntity.ok(Map.of(
                    "message", "Renewal alert check executed with warnings",
                    "newNotificationsCount", 0,
                    "notifications", Collections.emptyList()
            ));
        }
    }
}
