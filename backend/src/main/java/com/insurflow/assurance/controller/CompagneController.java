package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.CompagneRequest;
import com.insurflow.assurance.model.Compagne;
import com.insurflow.assurance.service.CompagneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Equivalent of compagneRoutes.js + compagneController.js */
@RestController
@RequestMapping("/api/compagnes")
@RequiredArgsConstructor
public class CompagneController {

    private final CompagneService compagneService;

    @GetMapping
    public List<Compagne> getAll() { return compagneService.getAll(); }

    @GetMapping("/{id}")
    public Compagne getById(@PathVariable String id) { return compagneService.getById(id); }

    @PostMapping
    public ResponseEntity<Compagne> create(@RequestBody CompagneRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(compagneService.create(req));
    }

    @PutMapping("/{id}")
    public Compagne update(@PathVariable String id, @RequestBody CompagneRequest req) {
        return compagneService.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        compagneService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Compagne deleted"));
    }
}
