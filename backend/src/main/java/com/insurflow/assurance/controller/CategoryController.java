package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.SimpleItemRequest;
import com.insurflow.assurance.model.Category;
import com.insurflow.assurance.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Category lookup CRUD — equivalent of categoryRoutes.js + categoryController.js */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final LookupService lookupService;

    @GetMapping
    public List<Category> getAll() { return lookupService.getAllCategories(); }

    @PostMapping
    public ResponseEntity<Category> create(@RequestBody SimpleItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lookupService.createCategory(req));
    }

    @PutMapping("/{id}")
    public Category update(@PathVariable String id, @RequestBody SimpleItemRequest req) {
        return lookupService.updateCategory(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        lookupService.deleteCategory(id);
        return ResponseEntity.ok(Map.of("message", "Category deleted"));
    }
}
