package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.SinistreRequest;
import com.insurflow.assurance.model.Sinistre;
import com.insurflow.assurance.model.Sinistre.SinistreStatus;
import com.insurflow.assurance.service.SinistreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sinistres")
@RequiredArgsConstructor
public class SinistreController {

    private final SinistreService sinistreService;

    @GetMapping
    public ResponseEntity<List<Sinistre>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String client,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(sinistreService.getAll(status, client, search));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(sinistreService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sinistre> getById(@PathVariable String id) {
        return ResponseEntity.ok(sinistreService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Sinistre> create(@RequestBody SinistreRequest req) {
        Sinistre created = sinistreService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sinistre> update(@PathVariable String id, @RequestBody SinistreRequest req) {
        return ResponseEntity.ok(sinistreService.update(id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Sinistre> updateStatus(
            @PathVariable String id,
            @RequestParam SinistreStatus status,
            @RequestParam(required = false) String notes
    ) {
        return ResponseEntity.ok(sinistreService.updateStatus(id, status, notes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        sinistreService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Sinistre supprimé avec succès"));
    }
}
