package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.ReferentielsResponse;
import com.insurflow.assurance.dto.SimpleItemRequest;
import com.insurflow.assurance.exception.ResourceNotFoundException;
import com.insurflow.assurance.model.*;
import com.insurflow.assurance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/** Handles CRUD for simple lookup entities: Nature, Category, Parametre, Tva. */
@Service
@RequiredArgsConstructor
public class LookupService {

    private final NatureRepository natureRepository;
    private final CategoryRepository categoryRepository;
    private final ParametreRepository parametreRepository;
    private final TvaRepository tvaRepository;

    public ReferentielsResponse getReferentiels() {
        CompletableFuture<List<Category>> catFuture = CompletableFuture.supplyAsync(this::getAllCategories);
        CompletableFuture<List<Nature>> natFuture = CompletableFuture.supplyAsync(this::getAllNatures);
        CompletableFuture<List<Parametre>> paramFuture = CompletableFuture.supplyAsync(this::getAllParametres);
        CompletableFuture<List<Tva>> tvaFuture = CompletableFuture.supplyAsync(this::getAllTvas);

        CompletableFuture.allOf(catFuture, natFuture, paramFuture, tvaFuture).join();

        return ReferentielsResponse.builder()
                .categories(catFuture.join())
                .natures(natFuture.join())
                .parametres(paramFuture.join())
                .tvas(tvaFuture.join())
                .build();
    }

    // ─── Nature ──────────────────────────────────────────────────────────────────
    public List<Nature> getAllNatures() { return natureRepository.findAll(); }
    public Nature createNature(SimpleItemRequest req) {
        return natureRepository.save(Nature.builder().name(req.getName()).build());
    }
    public Nature updateNature(String id, SimpleItemRequest req) {
        Nature n = natureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nature not found"));
        n.setName(req.getName());
        return natureRepository.save(n);
    }
    public void deleteNature(String id) {
        if (!natureRepository.existsById(id)) throw new ResourceNotFoundException("Nature not found");
        natureRepository.deleteById(id);
    }

    // ─── Category ────────────────────────────────────────────────────────────────
    public List<Category> getAllCategories() { return categoryRepository.findAll(); }
    public Category createCategory(SimpleItemRequest req) {
        return categoryRepository.save(Category.builder()
                .name(req.getName())
                .commissionRate(req.getCommissionRate() != null ? req.getCommissionRate() : 0.0)
                .build());
    }
    public Category updateCategory(String id, SimpleItemRequest req) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        c.setName(req.getName());
        if (req.getCommissionRate() != null) {
            c.setCommissionRate(req.getCommissionRate());
        }
        return categoryRepository.save(c);
    }
    public void deleteCategory(String id) {
        if (!categoryRepository.existsById(id)) throw new ResourceNotFoundException("Category not found");
        categoryRepository.deleteById(id);
    }

    // ─── Parametre ───────────────────────────────────────────────────────────────
    public List<Parametre> getAllParametres() {
        List<Parametre> list = parametreRepository.findAll();
        for (Parametre p : list) {
            if (p.getType() == null || p.getType().isBlank()) {
                p.setType("NUMBER");
            }
            if (p.getValue() == null) {
                p.setValue("0");
            }
        }
        return list;
    }

    public Parametre createParametre(SimpleItemRequest req) {
        return parametreRepository.save(Parametre.builder()
                .name(req.getName())
                .value(req.getValue() != null ? req.getValue() : "0")
                .type("NUMBER")
                .build());
    }

    public Parametre updateParametre(String id, SimpleItemRequest req) {
        Parametre p = parametreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parametre not found"));
        p.setName(req.getName());
        if (req.getValue() != null) {
            p.setValue(req.getValue());
        }
        p.setType("NUMBER");
        return parametreRepository.save(p);
    }
    public void deleteParametre(String id) {
        if (!parametreRepository.existsById(id)) throw new ResourceNotFoundException("Parametre not found");
        parametreRepository.deleteById(id);
    }

    // ─── TVA ─────────────────────────────────────────────────────────────────────
    public List<Tva> getAllTvas() { return tvaRepository.findAll(); }
    public Tva createTva(SimpleItemRequest req) {
        return tvaRepository.save(Tva.builder()
                .name(req.getName())
                .rate(req.getRate() != null ? req.getRate() : 0)
                .build());
    }
    public Tva updateTva(String id, SimpleItemRequest req) {
        Tva t = tvaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TVA not found"));
        t.setName(req.getName());
        if (req.getRate() != null) t.setRate(req.getRate());
        return tvaRepository.save(t);
    }
    public void deleteTva(String id) {
        if (!tvaRepository.existsById(id)) throw new ResourceNotFoundException("TVA not found");
        tvaRepository.deleteById(id);
    }
}
