package com.insurflow.assurance.service;

import com.insurflow.assurance.model.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.admin.email:admin@insurflow.com}")
    private String adminEmail;

    /**
     * Sends an email notification to the agency admin summarizing expiring policies.
     */
    public void sendRenewalAlertEmail(List<Notification> newNotifications) {
        if (newNotifications == null || newNotifications.isEmpty()) {
            return;
        }

        StringBuilder body = new StringBuilder();
        body.append("Bonjour,\n\n");
        body.append("Le système InsurFlow a détecté des polices d'assurance arrivant à échéance :\n\n");

        for (Notification n : newNotifications) {
            body.append(String.format("- Police N°: %s | Client: %s | Date d'échéance: %s | Alert: %s\n",
                    n.getPolicyNumber(),
                    n.getClientName(),
                    n.getExpirationDate(),
                    n.getType()));
        }

        body.append("\nVeuillez vous connecter à l'application InsurFlow pour traiter ces renouvellements.\n\n");
        body.append("Cordialement,\nInsurFlow Automated Alert System");

        String subject = String.format("[InsurFlow Alert] %d police(s) d'assurance arrivent à échéance", newNotifications.size());

        if (mailSender == null) {
            log.warn("JavaMailSender is not configured. Email alert logged only:\nSubject: {}\nBody:\n{}", subject, body);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(adminEmail);
            message.setSubject(subject);
            message.setText(body.toString());
            mailSender.send(message);
            log.info("✓ Sent policy renewal email alert to {}", adminEmail);
        } catch (Exception ex) {
            log.warn("Could not send email alert to {} (SMTP credentials may not be configured): {}", adminEmail, ex.getMessage());
        }
    }
}
