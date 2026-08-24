package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Notification;
import com.insurflow.assurance.model.NotificationType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByIsReadFalseOrderByCreatedAtDesc();

    List<Notification> findAllByOrderByCreatedAtDesc();

    long countByIsReadFalse();

    boolean existsByTypeAndReferenceId(NotificationType type, String referenceId);

    boolean existsByPolicyNumberAndType(String policyNumber, NotificationType type);
}
