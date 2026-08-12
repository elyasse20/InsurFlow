package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.ClientRequest;
import com.insurflow.assurance.exception.ResourceNotFoundException;
import com.insurflow.assurance.model.Client;
import com.insurflow.assurance.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Business logic for clients.
 * Equivalent of clientController.js.
 */
@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final FileStorageService fileStorageService;

    /** GET /api/clients?nom= */
    public List<Client> getAll(String nom) {
        if (nom != null && !nom.isBlank()) {
            // Try exact match first, fall back to partial
            List<Client> exact = clientRepository.findByNomRegexOrderByNomAsc(
                    "^" + nom.trim() + "$");
            if (!exact.isEmpty()) return exact;
            return clientRepository.searchByNom(nom.trim());
        }
        return clientRepository.findAllByOrderByNomAsc();
    }

    /** GET /api/clients/:id */
    public Client getById(String id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
    }

    /** POST /api/clients (multipart) */
    public Client create(ClientRequest req, MultipartFile file) throws IOException {
        validateRequest(req, true);

        String docPath = null;
        if (file != null && !file.isEmpty()) {
            validateFile(file);
            docPath = fileStorageService.store(file, "clients");
        }
        if (docPath == null) {
            throw new IllegalArgumentException("Le document justificatif est obligatoire");
        }

        Client client = Client.builder()
                .type(req.getType())
                .nom(req.getNom().trim())
                .tel(req.getTel().trim())
                .adresse(req.getAdresse().trim())
                .doc(docPath)
                .dateDebut(LocalDateTime.now())
                .budget(req.getBudget())
                .credit(req.getCredit())
                .build();

        applyTypeFields(client, req);
        return clientRepository.save(client);
    }

    /** PUT /api/clients/:id (multipart) */
    public Client update(String id, ClientRequest req, MultipartFile file) throws IOException {
        Client existing = getById(id);
        validateRequest(req, false);

        existing.setType(req.getType());
        existing.setNom(req.getNom().trim());
        existing.setTel(req.getTel().trim());
        existing.setAdresse(req.getAdresse().trim());
        existing.setBudget(req.getBudget());
        existing.setCredit(req.getCredit());

        if (file != null && !file.isEmpty()) {
            validateFile(file);
            // Optionally delete old file
            fileStorageService.delete(existing.getDoc());
            existing.setDoc(fileStorageService.store(file, "clients"));
        }

        applyTypeFields(existing, req);
        return clientRepository.save(existing);
    }

    /** DELETE /api/clients/:id */
    public Client delete(String id) {
        Client client = getById(id);
        clientRepository.deleteById(id);
        return client;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private void validateRequest(ClientRequest req, boolean isCreate) {
        if (req.getNom() == null || req.getNom().isBlank() ||
            req.getTel() == null || req.getTel().isBlank() ||
            req.getAdresse() == null || req.getAdresse().isBlank()) {
            throw new IllegalArgumentException("Les champs nom, téléphone et adresse sont obligatoires");
        }

        if (req.getBudget() < 0) {
            throw new IllegalArgumentException("Le budget ne peut pas être négatif");
        }
        if (req.getCredit() < 0) {
            throw new IllegalArgumentException("Le crédit ne peut pas être négatif");
        }

        if (req.getType() == Client.ClientType.particulier) {
            if (req.getCin() == null || req.getCin().isBlank() ||
                req.getPrenom() == null || req.getPrenom().isBlank()) {
                throw new IllegalArgumentException("Pour un particulier, le prénom et le CIN sont obligatoires");
            }
        }

        if (req.getType() == Client.ClientType.societe) {
            if (req.getIce() == null || req.getIce().isBlank() ||
                req.getIdentifiantFiscal() == null || req.getIdentifiantFiscal().isBlank() ||
                req.getRc() == null || req.getRc().isBlank()) {
                throw new IllegalArgumentException("Pour une société, l'ICE, l'Identifiant Fiscal et le RC sont obligatoires");
            }
            String iceTrimmed = req.getIce().trim();
            if (!iceTrimmed.matches("^\\d{15}$")) {
                throw new IllegalArgumentException("L'ICE doit comporter exactement 15 chiffres numériques (ex: 001234567890123)");
            }
        }
    }

    private void validateFile(MultipartFile file) {
        long maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("Le fichier ne doit pas dépasser 5 MB");
        }
        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase()
                : "";
        List<String> allowedExtensions = List.of(".pdf", ".jpg", ".jpeg", ".png");
        if (!allowedExtensions.contains(ext)) {
            throw new IllegalArgumentException("Format de fichier non autorisé. Formats acceptés : .pdf, .jpg, .jpeg, .png");
        }
    }

    private void applyTypeFields(Client client, ClientRequest req) {
        if (req.getType() == Client.ClientType.particulier) {
            client.setCin(req.getCin());
            client.setPrenom(req.getPrenom().trim());
            client.setIce(null);
            client.setIdentifiantFiscal(null);
            client.setRc(null);
        } else {
            client.setIce(req.getIce());
            client.setIdentifiantFiscal(req.getIdentifiantFiscal());
            client.setRc(req.getRc());
            client.setCin(null);
            client.setPrenom(null);
        }
    }
}
