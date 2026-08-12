package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Production;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionRepository extends MongoRepository<Production, String> {
    Optional<Production> findByNumpolice(String numpolice);
    boolean existsByNumpolice(String numpolice);
    List<Production> findByClientIgnoreCaseOrderByCreatedAtDesc(String client);
}
