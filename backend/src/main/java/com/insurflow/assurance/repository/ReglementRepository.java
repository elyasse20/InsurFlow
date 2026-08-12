package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Reglement;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReglementRepository extends MongoRepository<Reglement, String> {

    /** Find by production ID — mirrors Regelement.findOne({ production: productionId }) */
    Optional<Reglement> findByProductionId(String productionId);

    /** Filter by client name — mirrors $regex ^client$ */
    @Query("{ 'client': { $regex: ?0, $options: 'i' } }")
    List<Reglement> findByClientRegex(String clientRegex);
}
