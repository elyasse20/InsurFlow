package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Tva;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TvaRepository extends MongoRepository<Tva, String> {}
