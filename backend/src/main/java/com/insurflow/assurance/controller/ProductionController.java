package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.ProductionRequest;
import com.insurflow.assurance.model.Production;
import com.insurflow.assurance.service.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Equivalent of productionRoutes.js + productionController.js */
@RestController
@RequestMapping("/api/productions")
@RequiredArgsConstructor
public class ProductionController {

    private final ProductionService productionService;

    @GetMapping
    public List<Production> getAll(@RequestParam(required = false) Integer exercice) {
        return productionService.getAll(exercice);
    }

    @GetMapping("/{id}")
    public Production getById(@PathVariable String id) {
        return productionService.getById(id);
    }

    @PostMapping
    public ResponseEntity<Production> create(@RequestBody ProductionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productionService.create(req));
    }

    @PutMapping("/{id}")
    public Production update(@PathVariable String id, @RequestBody ProductionRequest req) {
        return productionService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        productionService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Production deleted successfully"));
    }
}
