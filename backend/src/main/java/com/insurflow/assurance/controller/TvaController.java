package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.SimpleItemRequest;
import com.insurflow.assurance.model.Tva;
import com.insurflow.assurance.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** TVA lookup CRUD — equivalent of TVAroutes.js + tvacontroller.js */
@RestController
@RequestMapping("/api/tva")
@RequiredArgsConstructor
public class TvaController {
    private final LookupService lookupService;

    @GetMapping
    public List<Tva> getAll() { return lookupService.getAllTvas(); }

    @PostMapping
    public ResponseEntity<Tva> create(@RequestBody SimpleItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lookupService.createTva(req));
    }

    @PutMapping("/{id}")
    public Tva update(@PathVariable String id, @RequestBody SimpleItemRequest req) {
        return lookupService.updateTva(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        lookupService.deleteTva(id);
        return ResponseEntity.ok(Map.of("message", "TVA deleted"));
    }
}
