package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Nature;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NatureRepository extends MongoRepository<Nature, String> {}
