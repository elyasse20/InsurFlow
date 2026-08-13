package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Invoice;
import com.insurflow.assurance.model.InvoiceStatus;
import com.insurflow.assurance.model.InvoiceType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {

    List<Invoice> findByStatusOrderByCreatedAtDesc(InvoiceStatus status);

    List<Invoice> findByTypeOrderByCreatedAtDesc(InvoiceType type);

    List<Invoice> findByClientNameContainingIgnoreCaseOrderByCreatedAtDesc(String clientName);

    List<Invoice> findAllByOrderByCreatedAtDesc();

    Optional<Invoice> findByOperationIdAndType(String operationId, InvoiceType type);

    long countByType(InvoiceType type);
}
