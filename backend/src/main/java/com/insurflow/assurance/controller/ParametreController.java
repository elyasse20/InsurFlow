package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.SimpleItemRequest;
import com.insurflow.assurance.model.Parametre;
import com.insurflow.assurance.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Parametre lookup CRUD — equivalent of parametreRoutes.js + parametreController.js */
@RestController
@RequestMapping("/api/parametres")
@RequiredArgsConstructor
public class ParametreController {
    private final LookupService lookupService;

    @GetMapping
    public List<Parametre> getAll() { return lookupService.getAllParametres(); }

    @PostMapping
    public ResponseEntity<Parametre> create(@RequestBody SimpleItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lookupService.createParametre(req));
    }

    @PutMapping("/{id}")
    public Parametre update(@PathVariable String id, @RequestBody SimpleItemRequest req) {
        return lookupService.updateParametre(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        lookupService.deleteParametre(id);
        return ResponseEntity.ok(Map.of("message", "Parametre deleted"));
    }
}
