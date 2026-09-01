package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Sinistre;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SinistreRepository extends MongoRepository<Sinistre, String> {

    Optional<Sinistre> findBySinistreNumber(String sinistreNumber);

    List<Sinistre> findAllByOrderByCreatedAtDesc();

    List<Sinistre> findByStatusOrderByCreatedAtDesc(Sinistre.SinistreStatus status);

    List<Sinistre> findByClientNameContainingIgnoreCaseOrderByCreatedAtDesc(String clientName);

    List<Sinistre> findByPolicyNumberOrderByCreatedAtDesc(String policyNumber);

    long countByStatus(Sinistre.SinistreStatus status);
}
