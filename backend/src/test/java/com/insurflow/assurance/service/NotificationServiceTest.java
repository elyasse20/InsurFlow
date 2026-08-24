package com.insurflow.assurance.service;

import com.insurflow.assurance.model.*;
import com.insurflow.assurance.repository.InvoiceRepository;
import com.insurflow.assurance.repository.NotificationRepository;
import com.insurflow.assurance.repository.ProductionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private ProductionRepository productionRepository;
    private InvoiceRepository invoiceRepository;
    private EmailService emailService;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = Mockito.mock(NotificationRepository.class);
        productionRepository = Mockito.mock(ProductionRepository.class);
        invoiceRepository = Mockito.mock(InvoiceRepository.class);
        emailService = Mockito.mock(EmailService.class);

        notificationService = new NotificationService(
                notificationRepository,
                productionRepository,
                invoiceRepository,
                emailService
        );
    }

    @Test
    @DisplayName("Should fetch unread count and notifications list")
    void testGetNotificationsAndCount() {
        when(notificationRepository.count()).thenReturn(5L);
        when(notificationRepository.countByIsReadFalse()).thenReturn(3L);

        Notification n1 = Notification.builder()
                .id("notif-1")
                .title("Alerte")
                .message("Test Message")
                .type(NotificationType.ECHEANCE_RENOUVELLEMENT)
                .severity(NotificationSeverity.INFO)
                .isRead(false)
                .build();

        when(notificationRepository.findByIsReadFalseOrderByCreatedAtDesc()).thenReturn(List.of(n1));

        long count = notificationService.getUnreadCount();
        assertEquals(3L, count);

        List<Notification> unread = notificationService.getAllNotifications(true);
        assertEquals(1, unread.size());
        assertEquals("notif-1", unread.get(0).getId());
    }

    @Test
    @DisplayName("Should mark notification as read")
    void testMarkAsRead() {
        Notification n = Notification.builder()
                .id("notif-1")
                .isRead(false)
                .build();

        when(notificationRepository.findById("notif-1")).thenReturn(Optional.of(n));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.markAsRead("notif-1");
        assertNotNull(result);
        assertTrue(result.isRead());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Should generate automated alerts for expiring policies, overdue invoices and AI fraud")
    void testGenerateAutomatedAlerts() {
        // Expiring production (1 year after dateEff) -> 20 days left
        LocalDate eff = LocalDate.now().minusYears(1).plusDays(20);
        Production prod = Production.builder()
                .id("prod-1")
                .numpolice("POL-2026-099")
                .client("Test Client")
                .dateEff(eff)
                .parameters(List.of(
                        ProductionParameter.builder()
                                .primes(5000.0)
                                .taxe(700.0)
                                .accessoire(100.0)
                                .cnpc(35.0)
                                .build()
                ))
                .build();

        when(productionRepository.findAll()).thenReturn(List.of(prod));

        // Overdue invoice
        Invoice inv = Invoice.builder()
                .id("inv-1")
                .invoiceNumber("FAC-2026-099")
                .clientName("Test Client Overdue")
                .policyNumber("POL-2026-099")
                .status(InvoiceStatus.UNPAID)
                .amountTTC(12500.0)
                .remainingAmount(12500.0)
                .dueDate(LocalDate.now().minusDays(10))
                .build();

        when(invoiceRepository.findAll()).thenReturn(List.of(inv));

        when(notificationRepository.existsByTypeAndReferenceId(any(), any())).thenReturn(false);
        when(notificationRepository.existsByPolicyNumberAndType(any(), any())).thenReturn(false);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        List<Notification> created = notificationService.generateAutomatedAlerts();

        assertNotNull(created);
        assertTrue(created.size() >= 3); // Policy renewal, unpaid invoice, and AI alerts

        boolean hasRenewal = created.stream().anyMatch(n -> n.getType() == NotificationType.ECHEANCE_RENOUVELLEMENT);
        boolean hasUnpaid = created.stream().anyMatch(n -> n.getType() == NotificationType.QUITTANCE_IMPAYEE);
        boolean hasFraud = created.stream().anyMatch(n -> n.getType() == NotificationType.FRAUDE_IA);
        boolean hasAtlasMock = created.stream().anyMatch(n -> "Travaux Généraux Atlas".equals(n.getClientName()) && n.getAmount() != null && n.getAmount() == 14500.0);

        assertTrue(hasRenewal, "Should create renewal alert");
        assertTrue(hasUnpaid, "Should create unpaid invoice alert");
        assertTrue(hasFraud, "Should create AI fraud alert");
        assertTrue(hasAtlasMock, "Should create Travaux Généraux Atlas overdue unpaid invoice alert");
    }
}
