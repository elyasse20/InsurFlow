package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.SimpleItemRequest;
import com.insurflow.assurance.model.*;
import com.insurflow.assurance.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Nature lookup CRUD — equivalent of natureRoutes.js + natureController.js */
@RestController
@RequestMapping("/api/natures")
@RequiredArgsConstructor
public class NatureController {
    private final LookupService lookupService;

    @GetMapping
    public List<Nature> getAll() { return lookupService.getAllNatures(); }

    @PostMapping
    public ResponseEntity<Nature> create(@RequestBody SimpleItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lookupService.createNature(req));
    }

    @PutMapping("/{id}")
    public Nature update(@PathVariable String id, @RequestBody SimpleItemRequest req) {
        return lookupService.updateNature(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        lookupService.deleteNature(id);
        return ResponseEntity.ok(Map.of("message", "Nature deleted"));
    }
}
