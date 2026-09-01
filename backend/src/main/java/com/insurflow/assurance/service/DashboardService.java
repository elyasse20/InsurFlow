package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.DashboardStats;
import com.insurflow.assurance.model.Payment;
import com.insurflow.assurance.model.Production;
import com.insurflow.assurance.model.Reglement;
import com.insurflow.assurance.repository.ClientRepository;
import com.insurflow.assurance.repository.ProductionRepository;
import com.insurflow.assurance.repository.ReglementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Computes all dashboard aggregations in-memory from MongoDB collections.
 * This avoids complex MongoDB aggregation pipelines while keeping the
 * frontend to a single HTTP call.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductionRepository productionRepository;
    private final ReglementRepository reglementRepository;
    private final ClientRepository clientRepository;

    public DashboardStats getStats() {
        return getStats(java.time.LocalDate.now().getYear());
    }

    public DashboardStats getStats(int exercice) {
        List<Production> allProductions = productionRepository.findAll();
        List<Reglement> allReglements = reglementRepository.findAll();
        long totalClients = clientRepository.count();

        // Filter productions by exercice
        List<Production> productions = allProductions.stream()
                .filter(p -> p.getExercice() != null && p.getExercice().equals(exercice))
                .collect(Collectors.toList());

        // Filter reglements by exercice
        List<Reglement> regelements = allReglements.stream()
                .filter(r -> r.getExercice() != null && r.getExercice().equals(exercice))
                .collect(Collectors.toList());

        // ── Montants ──────────────────────────────────────────────────────────
        double montantTotal = productions.stream()
                .mapToDouble(Production::getMontantTotal)
        .sum();

        double montantRegle = regelements.stream()
                .flatMap(r -> {
                    List<Payment> pmts = r.getPayments();
                    return (pmts != null ? pmts : Collections.<Payment>emptyList()).stream();
                })
                .mapToDouble(Payment::getMontant)
                .sum();

        double montantRestant = Math.max(0, montantTotal - montantRegle);

        // ── Reglement status counts ────────────────────────────────────────────
        long paie     = regelements.stream().filter(r -> r.getStatus() == Reglement.ReglementStatus.PAYE).count();
        long partiel  = regelements.stream().filter(r -> r.getStatus() == Reglement.ReglementStatus.PARTIEL).count();
        long attente  = regelements.stream().filter(r -> r.getStatus() == Reglement.ReglementStatus.EN_ATTENTE).count();

        // ── By Category ───────────────────────────────────────────────────────
        Map<String, List<Production>> byCategory = productions.stream()
                .collect(Collectors.groupingBy(p -> p.getCategory() != null ? p.getCategory() : "Autre"));

        List<DashboardStats.CategoryStat> categoryStats = byCategory.entrySet().stream()
                .map(e -> DashboardStats.CategoryStat.builder()
                        .category(e.getKey())
                        .count(e.getValue().size())
                        .montant(e.getValue().stream().mapToDouble(Production::getMontantTotal).sum())
                        .build())
                .sorted(Comparator.comparingDouble(DashboardStats.CategoryStat::getMontant).reversed())
                .collect(Collectors.toList());

        // ── By Compagne ───────────────────────────────────────────────────────
        Map<String, Long> byCompagne = productions.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getCompagne() != null ? p.getCompagne() : "Autre",
                        Collectors.counting()
                ));

        List<DashboardStats.LabelValue> compagneStats = byCompagne.entrySet().stream()
                .map(e -> DashboardStats.LabelValue.builder()
                        .label(e.getKey())
                        .value(e.getValue())
                        .build())
                .sorted(Comparator.comparingDouble(DashboardStats.LabelValue::getValue).reversed())
                .limit(8)
                .collect(Collectors.toList());

        // ── By Month (12 months of the selected exercice year YYYY-01 to YYYY-12) ──
        Map<String, Double> byMonthMontantMap = new HashMap<>();
        Map<String, Long> byMonthCountMap = new HashMap<>();

        for (Production p : productions) {
            String monthKey = null;
            if (p.getDateEff() != null) {
                monthKey = String.format("%04d-%02d", p.getDateEff().getYear(), p.getDateEff().getMonthValue());
            } else if (p.getMoisDem() != null && p.getMoisDem().length() >= 7) {
                monthKey = p.getMoisDem().substring(0, 7);
            } else if (p.getCreatedAt() != null) {
                monthKey = String.format("%04d-%02d", p.getCreatedAt().getYear(), p.getCreatedAt().getMonthValue());
            }
            if (monthKey != null) {
                byMonthCountMap.put(monthKey, byMonthCountMap.getOrDefault(monthKey, 0L) + 1);
                byMonthMontantMap.put(monthKey, byMonthMontantMap.getOrDefault(monthKey, 0.0) + p.getMontantTotal());
            }
        }

        List<DashboardStats.LabelValue> monthStats = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            String key = String.format("%04d-%02d", exercice, m);
            monthStats.add(DashboardStats.LabelValue.builder()
                    .label(key)
                    .value(Math.round(byMonthMontantMap.getOrDefault(key, 0.0) * 100.0) / 100.0)
                    .count(byMonthCountMap.getOrDefault(key, 0L))
                    .build());
        }

        // ── Recent productions (last 5 for this exercice) ───────────────────────
        Map<String, String> reglementStatusByProdId = regelements.stream()
                .filter(r -> r.getProduction() != null)
                .collect(Collectors.toMap(
                        r -> r.getProduction().getId(),
                        r -> r.getStatus().name(),
                        (a, b) -> a
                ));

        List<DashboardStats.RecentProduction> recentProductions = productions.stream()
                .sorted((p1, p2) -> {
                    if (p1.getCreatedAt() != null && p2.getCreatedAt() != null) {
                        return p2.getCreatedAt().compareTo(p1.getCreatedAt());
                    }
                    return 0;
                })
                .limit(5)
                .map(p -> DashboardStats.RecentProduction.builder()
                        .id(p.getId())
                        .numpolice(p.getNumpolice())
                        .client(p.getClient())
                        .category(p.getCategory())
                        .compagne(p.getCompagne())
                        .montant(p.getMontantTotal())
                        .dateEff(p.getDateEff() != null ? p.getDateEff().toString() : null)
                        .reglementStatus(reglementStatusByProdId.get(p.getId()))
                        .build())
                .collect(Collectors.toList());

        return DashboardStats.builder()
                .totalProductions(productions.size())
                .montantTotal(montantTotal)
                .montantRegle(montantRegle)
                .montantRestant(montantRestant)
                .totalClients(totalClients)
                .reglementsPaie(paie)
                .reglementsPartiel(partiel)
                .reglementsEnAttente(attente)
                .byCategory(categoryStats)
                .byCompagne(compagneStats)
                .byMonth(monthStats)
                .recentProductions(recentProductions)
                .build();
    }
}
