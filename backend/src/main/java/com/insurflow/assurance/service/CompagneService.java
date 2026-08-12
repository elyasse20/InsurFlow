package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.CompagneRequest;
import com.insurflow.assurance.exception.ResourceNotFoundException;
import com.insurflow.assurance.model.*;
import com.insurflow.assurance.repository.CompagneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompagneService {

    private final CompagneRepository compagneRepository;

    public List<Compagne> getAll() { return compagneRepository.findAll(); }

    public Compagne getById(String id) {
        return compagneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compagne not found"));
    }

    public Compagne create(CompagneRequest req) {
        return compagneRepository.save(mapFromRequest(new Compagne(), req));
    }

    public Compagne update(String id, CompagneRequest req) {
        Compagne c = getById(id);
        return compagneRepository.save(mapFromRequest(c, req));
    }

    public void delete(String id) {
        if (!compagneRepository.existsById(id)) {
            throw new ResourceNotFoundException("Compagne not found");
        }
        compagneRepository.deleteById(id);
    }

    private Compagne mapFromRequest(Compagne compagne, CompagneRequest req) {
        compagne.setCompagneName(req.getCompagneName());
        if (req.getCategories() != null) {
            compagne.setCategories(req.getCategories().stream().map(catReq -> {
                CompagneCategory cat = new CompagneCategory();
                cat.setName(catReq.getName());
                cat.setIndec(catReq.getIndec());
                if (catReq.getParameters() != null) {
                    cat.setParameters(catReq.getParameters().stream()
                            .map(pReq -> new CompagneParameter(pReq.getName(), pReq.getPercent()))
                            .collect(Collectors.toList()));
                }
                return cat;
            }).collect(Collectors.toList()));
        }
        return compagne;
    }
}
