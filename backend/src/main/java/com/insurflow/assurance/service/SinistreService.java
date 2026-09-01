package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.SinistreRequest;
import com.insurflow.assurance.model.Production;
import com.insurflow.assurance.model.Sinistre;
import com.insurflow.assurance.model.Sinistre.SinistreStatus;
import com.insurflow.assurance.repository.ProductionRepository;
import com.insurflow.assurance.repository.SinistreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SinistreService {

    private final SinistreRepository sinistreRepository;
    private final ProductionRepository productionRepository;

    public List<Sinistre> getAll(String status, String client, String search) {
        List<Sinistre> list = sinistreRepository.findAllByOrderByCreatedAtDesc();

        if (status != null && !status.trim().isEmpty()) {
            try {
                SinistreStatus st = SinistreStatus.valueOf(status.toUpperCase().trim());
                list = list.stream().filter(s -> s.getStatus() == st).collect(Collectors.toList());
            } catch (IllegalArgumentException ignored) {}
        }

        if (client != null && !client.trim().isEmpty()) {
            String q = client.toLowerCase().trim();
            list = list.stream().filter(s -> s.getClientName() != null && s.getClientName().toLowerCase().contains(q)).collect(Collectors.toList());
        }

        if (search != null && !search.trim().isEmpty()) {
            String q = search.toLowerCase().trim();
            list = list.stream().filter(s ->
                    (s.getSinistreNumber() != null && s.getSinistreNumber().toLowerCase().contains(q)) ||
                    (s.getClientName() != null && s.getClientName().toLowerCase().contains(q)) ||
                    (s.getPolicyNumber() != null && s.getPolicyNumber().toLowerCase().contains(q)) ||
                    (s.getCompagne() != null && s.getCompagne().toLowerCase().contains(q)) ||
                    (s.getCategory() != null && s.getCategory().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }

        return list;
    }

    public Sinistre getById(String id) {
        return sinistreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sinistre non trouvé avec l'id : " + id));
    }

    public Sinistre create(SinistreRequest req) {
        int year = req.getIncidentDate() != null ? req.getIncidentDate().getYear() : LocalDate.now().getYear();

        String sinistreNumber = req.getSinistreNumber();
        if (sinistreNumber == null || sinistreNumber.trim().isEmpty()) {
            sinistreNumber = generateNextSinistreNumber(year);
        }

        // Auto-detect company & category from production if missing
        String compagne = req.getCompagne();
        String category = req.getCategory();
        if ((compagne == null || compagne.trim().isEmpty() || category == null || category.trim().isEmpty()) && req.getPolicyNumber() != null) {
            Optional<Production> prodOpt = productionRepository.findByNumpolice(req.getPolicyNumber());
            if (prodOpt.isPresent()) {
                Production prod = prodOpt.get();
                if (compagne == null || compagne.trim().isEmpty()) compagne = prod.getCompagne();
                if (category == null || category.trim().isEmpty()) category = prod.getCategory();
            }
        }

        double damage = req.getEstimatedDamage() != null ? req.getEstimatedDamage() : 0.0;
        double deductible = req.getDeductible() != null ? req.getDeductible() : 0.0;
        double netPayout = req.getNetPayout() != null ? req.getNetPayout() : Math.max(0, damage - deductible);

        Integer liabilityRate = req.getLiabilityRate();
        if (liabilityRate == null && req.getLiabilityAssessment() != null) {
            liabilityRate = parseLiabilityRate(req.getLiabilityAssessment());
        }

        Sinistre sinistre = Sinistre.builder()
                .sinistreNumber(sinistreNumber)
                .clientName(req.getClientName())
                .policyNumber(req.getPolicyNumber())
                .compagne(compagne)
                .category(category)
                .incidentDate(req.getIncidentDate() != null ? req.getIncidentDate() : LocalDate.now())
                .declarationDate(req.getDeclarationDate() != null ? req.getDeclarationDate() : LocalDate.now())
                .claimText(req.getClaimText())
                .status(req.getStatus() != null ? req.getStatus() : SinistreStatus.DECLARE)
                .fraudRiskScore(req.getFraudRiskScore() != null ? req.getFraudRiskScore() : 0)
                .fraudRiskLevel(req.getFraudRiskLevel() != null ? req.getFraudRiskLevel() : "FAIBLE")
                .liabilityAssessment(req.getLiabilityAssessment())
                .liabilityRate(liabilityRate)
                .estimatedDamage(damage)
                .deductible(deductible)
                .netPayout(netPayout)
                .riskFlags(req.getRiskFlags() != null ? req.getRiskFlags() : new ArrayList<>())
                .recommendedActions(req.getRecommendedActions() != null ? req.getRecommendedActions() : new ArrayList<>())
                .executiveSummary(req.getExecutiveSummary())
                .notes(req.getNotes())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return sinistreRepository.save(sinistre);
    }

    public Sinistre update(String id, SinistreRequest req) {
        Sinistre s = getById(id);

        if (req.getClientName() != null) s.setClientName(req.getClientName());
        if (req.getPolicyNumber() != null) s.setPolicyNumber(req.getPolicyNumber());
        if (req.getCompagne() != null) s.setCompagne(req.getCompagne());
        if (req.getCategory() != null) s.setCategory(req.getCategory());
        if (req.getIncidentDate() != null) s.setIncidentDate(req.getIncidentDate());
        if (req.getClaimText() != null) s.setClaimText(req.getClaimText());
        if (req.getStatus() != null) s.setStatus(req.getStatus());
        if (req.getFraudRiskScore() != null) s.setFraudRiskScore(req.getFraudRiskScore());
        if (req.getFraudRiskLevel() != null) s.setFraudRiskLevel(req.getFraudRiskLevel());
        if (req.getLiabilityAssessment() != null) s.setLiabilityAssessment(req.getLiabilityAssessment());
        if (req.getLiabilityRate() != null) s.setLiabilityRate(req.getLiabilityRate());
        if (req.getEstimatedDamage() != null) s.setEstimatedDamage(req.getEstimatedDamage());
        if (req.getDeductible() != null) s.setDeductible(req.getDeductible());
        if (req.getNetPayout() != null) s.setNetPayout(req.getNetPayout());
        if (req.getRiskFlags() != null) s.setRiskFlags(req.getRiskFlags());
        if (req.getRecommendedActions() != null) s.setRecommendedActions(req.getRecommendedActions());
        if (req.getExecutiveSummary() != null) s.setExecutiveSummary(req.getExecutiveSummary());
        if (req.getNotes() != null) s.setNotes(req.getNotes());

        s.setUpdatedAt(LocalDateTime.now());
        return sinistreRepository.save(s);
    }

    public Sinistre updateStatus(String id, SinistreStatus status, String notes) {
        Sinistre s = getById(id);
        s.setStatus(status);
        if (notes != null && !notes.trim().isEmpty()) {
            s.setNotes(notes);
        }
        s.setUpdatedAt(LocalDateTime.now());
        return sinistreRepository.save(s);
    }

    public void delete(String id) {
        sinistreRepository.deleteById(id);
    }

    public Map<String, Object> getStats() {
        List<Sinistre> all = sinistreRepository.findAll();
        long total = all.size();
        long declare = all.stream().filter(s -> s.getStatus() == SinistreStatus.DECLARE).count();
        long enExpertise = all.stream().filter(s -> s.getStatus() == SinistreStatus.EN_EXPERTISE).count();
        long indemnise = all.stream().filter(s -> s.getStatus() == SinistreStatus.INDEMNISE).count();
        long cloture = all.stream().filter(s -> s.getStatus() == SinistreStatus.CLOTURE).count();
        long refuse = all.stream().filter(s -> s.getStatus() == SinistreStatus.REFUSE).count();

        double totalDamage = all.stream().mapToDouble(Sinistre::getEstimatedDamage).sum();
        double totalNetPayout = all.stream().mapToDouble(Sinistre::getNetPayout).sum();
        double avgFraudScore = all.isEmpty() ? 0.0 : all.stream().mapToInt(Sinistre::getFraudRiskScore).average().orElse(0.0);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("declare", declare);
        stats.put("enExpertise", enExpertise);
        stats.put("indemnise", indemnise);
        stats.put("cloture", cloture);
        stats.put("refuse", refuse);
        stats.put("totalDamage", totalDamage);
        stats.put("totalNetPayout", totalNetPayout);
        stats.put("avgFraudScore", Math.round(avgFraudScore * 10.0) / 10.0);
        return stats;
    }

    private String generateNextSinistreNumber(int year) {
        String prefix = String.format("SIN-%04d-", year);
        List<Sinistre> list = sinistreRepository.findAll();
        int maxSeq = 0;
        for (Sinistre s : list) {
            if (s.getSinistreNumber() != null && s.getSinistreNumber().startsWith(prefix)) {
                String seqStr = s.getSinistreNumber().substring(prefix.length());
                try {
                    int parsed = Integer.parseInt(seqStr);
                    if (parsed > maxSeq) maxSeq = parsed;
                } catch (NumberFormatException ignored) {}
            }
        }
        return String.format("SIN-%04d-%04d", year, maxSeq + 1);
    }

    private Integer parseLiabilityRate(String assessment) {
        if (assessment == null) return 0;
        String lower = assessment.toLowerCase();
        if (lower.contains("0%")) return 0;
        if (lower.contains("50%") || lower.contains("50/50") || lower.contains("partagée")) return 50;
        if (lower.contains("100% responsable") || lower.contains("100% at-fault")) return 100;
        return 0;
    }
}
