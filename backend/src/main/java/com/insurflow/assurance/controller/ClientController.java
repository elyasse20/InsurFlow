package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.CinScanResultDto;
import com.insurflow.assurance.dto.ClientRequest;
import com.insurflow.assurance.model.Client;
import com.insurflow.assurance.service.CinOcrService;
import com.insurflow.assurance.service.ClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Equivalent of clientRoutes.js + clientController.js.
 * POST and PUT use multipart/form-data (equivalent of multer upload.single('doc')).
 */
@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;
    private final CinOcrService cinOcrService;

    /**
     * POST /api/clients/scan-cin — AI OCR document scanner for Moroccan CIN / Permis cards.
     */
    @PostMapping(value = "/scan-cin", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CinScanResultDto> scanCin(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(cinOcrService.scanCinDocument(file));
    }

    /** GET /api/clients?nom= — equivalent of getClients */
    @GetMapping
    public List<Client> getAll(@RequestParam(required = false) String nom) {
        return clientService.getAll(nom);
    }

    /** GET /api/clients/:id — equivalent of getClient */
    @GetMapping("/{id}")
    public Client getById(@PathVariable String id) {
        return clientService.getById(id);
    }

    /**
     * POST /api/clients — equivalent of router.post('/', upload.single('doc'), addClient)
     * Accepts multipart/form-data with JSON fields + optional 'doc' file.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Client> create(
            @RequestPart("data") ClientRequest req,
            @RequestPart(value = "doc", required = false) MultipartFile file) throws IOException {
        Client created = clientService.create(req, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/clients/:id — equivalent of router.put('/:id', upload.single('doc'), updateClient)
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Client update(
            @PathVariable String id,
            @RequestPart("data") ClientRequest req,
            @RequestPart(value = "doc", required = false) MultipartFile file) throws IOException {
        return clientService.update(id, req, file);
    }

    /** DELETE /api/clients/:id — equivalent of deleteClient */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        Client deleted = clientService.delete(id);
        return ResponseEntity.ok(Map.of(
                "message", "Client deleted successfully",
                "deletedClient", deleted));
    }
}
