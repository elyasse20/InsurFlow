package com.insurflow.assurance.controller;

import com.insurflow.assurance.model.Notification;
import com.insurflow.assurance.service.NotificationService;
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

    private final NotificationService notificationService;

    /**
     * GET /api/notifications — Fetch notifications.
     * Default returns unread only, or all if unreadOnly=false.
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestParam(defaultValue = "true") boolean unreadOnly) {
        try {
            List<Notification> list = notificationService.getAllNotifications(unreadOnly);
            return ResponseEntity.ok(list != null ? list : Collections.emptyList());
        } catch (Exception ex) {
            log.error("Error in getNotifications: ", ex);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * GET /api/notifications/unread-count — Get count of unread notifications.
     */
    @GetMapping({"/unread-count", "/count"})
    public ResponseEntity<Map<String, Object>> getUnreadCount() {
        try {
            long count = notificationService.getUnreadCount();
            return ResponseEntity.ok(Map.of("count", count, "unreadCount", count));
        } catch (Exception ex) {
            log.error("Error in getUnreadCount: ", ex);
            return ResponseEntity.ok(Map.of("count", 0L, "unreadCount", 0L));
        }
    }

    /**
     * PATCH /api/notifications/{id}/read — Mark a single notification as read.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        try {
            Notification updated = notificationService.markAsRead(id);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception ex) {
            log.error("Error marking notification {} as read: ", id, ex);
            return ResponseEntity.ok().build();
        }
    }

    /**
     * POST /api/notifications/mark-all-read & PATCH /api/notifications/read-all — Mark all notifications as read.
     */
    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllAsReadPost() {
        try {
            notificationService.markAllAsRead();
            return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
        } catch (Exception ex) {
            log.error("Error marking all notifications as read: ", ex);
            return ResponseEntity.ok(Map.of("message", "Operation completed"));
        }
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsReadPatch() {
        return markAllAsReadPost();
    }

    /**
     * POST /api/notifications/refresh & POST /api/notifications/trigger-check
     * Manually triggers automated alerts evaluation and returns refreshed notification list.
     */
    @PostMapping({"/refresh", "/trigger-check"})
    public ResponseEntity<Map<String, Object>> refreshNotifications() {
        try {
            List<Notification> newlyGenerated = notificationService.generateAutomatedAlerts();
            List<Notification> activeNotifications = notificationService.getAllNotifications(true);
            long unreadCount = notificationService.getUnreadCount();

            return ResponseEntity.ok(Map.of(
                    "message", "Notifications refreshed successfully",
                    "newAlertsCount", newlyGenerated.size(),
                    "unreadCount", unreadCount,
                    "notifications", activeNotifications != null ? activeNotifications : Collections.emptyList()
            ));
        } catch (Exception ex) {
            log.error("Error refreshing notifications: ", ex);
            return ResponseEntity.ok(Map.of(
                    "message", "Refreshed with warnings",
                    "newAlertsCount", 0,
                    "unreadCount", 0L,
                    "notifications", Collections.emptyList()
            ));
        }
    }
}
