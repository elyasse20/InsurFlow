package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.ReglementRequest;
import com.insurflow.assurance.model.Reglement;
import com.insurflow.assurance.service.ReglementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Equivalent of regelementRoutes.js + regelementController.js.
 *
 * The paiement endpoint uses multipart/form-data to support file attachments
 * (equivalent of upload.any() in regelementRoutes.js).
 */
@RestController
@RequestMapping("/api/regelements")
@RequiredArgsConstructor
public class ReglementController {

    private final ReglementService reglementService;
    private final ObjectMapper objectMapper;

    /** GET /api/regelements?client= — equivalent of getAllReglements */
    @GetMapping
    public List<Reglement> getAll(@RequestParam(required = false) String client) {
        return reglementService.getAll(client);
    }

    /** GET /api/regelements/all — equivalent of getAllRegles */
    @GetMapping("/all")
    public List<Reglement> getAllRaw() {
        return reglementService.getAllRaw();
    }

    /** GET /api/regelements/:productionId — equivalent of getRegelementByProduction */
    @GetMapping("/{productionId}")
    public Reglement getByProduction(@PathVariable String productionId) {
        return reglementService.getByProduction(productionId);
    }

    /**
     * POST /api/regelements/:productionId/paiement — equivalent of createOrUpdateRegelementPaiement.
     *
     * Accepts multipart/form-data:
     *   - 'data'  : JSON string of ReglementRequest
     *   - 'files' : optional file attachments (one per payment)
     */
    @PostMapping(value = "/{productionId}/paiement", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Reglement> createOrUpdatePaiement(
            @PathVariable String productionId,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files)
            throws IOException {

        ReglementRequest req = objectMapper.readValue(dataJson, ReglementRequest.class);
        Reglement result = reglementService.createOrUpdatePaiement(productionId, req, files);
        return ResponseEntity.ok(result);
    }
}
