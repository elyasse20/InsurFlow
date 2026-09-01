package com.insurflow.assurance.controller;

import com.insurflow.assurance.service.DataSeederService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/seed")
@RequiredArgsConstructor
public class DataSeederController {

    private final DataSeederService dataSeederService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> seedData(@RequestParam(defaultValue = "true") boolean reset) {
        Map<String, Object> response = dataSeederService.seedMockData(reset);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> seedDataGet(@RequestParam(defaultValue = "true") boolean reset) {
        Map<String, Object> response = dataSeederService.seedMockData(reset);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/migrate-policies")
    public ResponseEntity<Map<String, Object>> migratePoliciesPost() {
        Map<String, Object> response = dataSeederService.migrateAndNormalizePolicyNumbers();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/migrate-policies")
    public ResponseEntity<Map<String, Object>> migratePoliciesGet() {
        Map<String, Object> response = dataSeederService.migrateAndNormalizePolicyNumbers();
        return ResponseEntity.ok(response);
    }
}
