package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.ProductionRequest;
import com.insurflow.assurance.exception.ResourceNotFoundException;
import com.insurflow.assurance.model.CompagneRepartition;
import com.insurflow.assurance.model.Production;
import com.insurflow.assurance.model.ProductionParameter;
import com.insurflow.assurance.repository.ProductionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for productions (insurance policies).
 * Equivalent of productionController.js.
 */
@Service
@RequiredArgsConstructor
public class ProductionService {

    private final ProductionRepository productionRepository;

    public List<Production> getAll() {
        return getAll(null);
    }

    public List<Production> getAll(Integer exercice) {
        List<Production> all = productionRepository.findAll();
        if (exercice == null) {
            return all;
        }
        return all.stream()
                .filter(p -> p.getExercice() != null && p.getExercice().equals(exercice))
                .collect(Collectors.toList());
    }

    public Production getById(String id) {
        return productionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Production not found"));
    }

    public Production create(ProductionRequest req) {
        if (productionRepository.existsByNumpolice(req.getNumpolice())) {
            throw new IllegalArgumentException("numpolice already exists: " + req.getNumpolice());
        }
        Production prod = mapFromRequest(new Production(), req);
        return productionRepository.save(prod);
    }

    public Production update(String id, ProductionRequest req) {
        Production prod = getById(id);
        mapFromRequest(prod, req);
        return productionRepository.save(prod);
    }

    public void delete(String id) {
        if (!productionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Production not found");
        }
        productionRepository.deleteById(id);
    }

    private Production mapFromRequest(Production prod, ProductionRequest req) {
        prod.setNatureOperation(req.getNatureOperation());
        prod.setClient(req.getClient());
        prod.setDateEff(req.getDateEff() != null ? LocalDate.parse(req.getDateEff()) : null);
        prod.setMoisDem(req.getMoisDem());
        prod.setCompagne(req.getCompagne());
        prod.setTvaRate(req.getTvaRate());
        prod.setCategory(req.getCategory());
        prod.setNumpolice(req.getNumpolice());
        prod.setRefCie(req.getRefCie());
        prod.setCertificat(req.getCertificat());
        prod.setNavire(req.getNavire());
        prod.setOrdre(req.getOrdre());

        // Map répartitions (company split percentages)
        if (req.getRepartitions() != null) {
            prod.setRepartitions(req.getRepartitions().stream()
                    .map(r -> CompagneRepartition.builder()
                            .compagneName(r.getCompagneName())
                            .percent(r.getPercent())
                            .build())
                    .collect(Collectors.toList()));
        }

        if (req.getParameters() != null) {
            prod.setParameters(req.getParameters().stream()
                    .map(p -> ProductionParameter.builder()
                            .name(p.getName())
                            .primes(p.getPrimes())
                            .taxe(p.getTaxe())
                            .taxepara(p.getTaxepara())
                            .accessoire(p.getAccessoire())
                            .cnpc(p.getCnpc())
                            .commission(p.getCommission())
                            .build())
                    .collect(Collectors.toList()));
        }
        return prod;
    }
}
