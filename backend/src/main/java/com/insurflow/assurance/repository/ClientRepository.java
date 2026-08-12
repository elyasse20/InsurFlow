package com.insurflow.assurance.repository;

import com.insurflow.assurance.model.Client;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientRepository extends MongoRepository<Client, String> {

    /** Exact match, case-insensitive, sorted by nom — mirrors $regex ^name$ in clientController */
    @Query("{ 'nom': { $regex: ?0, $options: 'i' } }")
    List<Client> findByNomRegexOrderByNomAsc(String regex);

    List<Client> findAllByOrderByNomAsc();

    /** Fuzzy search by name */
    @Query("{ 'nom': { $regex: ?0, $options: 'i' } }")
    List<Client> searchByNom(String partialNom);
}
