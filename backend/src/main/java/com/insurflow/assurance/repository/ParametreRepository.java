package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Parametre;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParametreRepository extends MongoRepository<Parametre, String> {}
