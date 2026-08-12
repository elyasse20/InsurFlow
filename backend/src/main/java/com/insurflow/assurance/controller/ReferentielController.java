package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.ReferentielsResponse;
import com.insurflow.assurance.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * BFF Aggregator Controller — returns all reference datasets in a single HTTP request.
 */
@RestController
@RequestMapping("/api/referentiels")
@RequiredArgsConstructor
public class ReferentielController {

    private final LookupService lookupService;

    @GetMapping
    public ReferentielsResponse getReferentiels() {
        return lookupService.getReferentiels();
    }
}
