package com.insurflow.assurance.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for GET /api/dashboard/stats.
 * All aggregations are done server-side to minimise HTTP round-trips.
 */
@Data
@Builder
public class DashboardStats {

    // ── KPI cards ─────────────────────────────────────────────────────────────
    private long totalProductions;
    private double montantTotal;        // sum of all production montantTotal virtuals
    private double montantRegle;        // sum of all reglement payments (client)
    private double montantRestant;      // montantTotal - montantRegle
    private long totalClients;

    // ── Status breakdown ──────────────────────────────────────────────────────
    private long reglementsPaie;
    private long reglementsPartiel;
    private long reglementsEnAttente;

    // ── Groupings for charts ──────────────────────────────────────────────────
    /** Count + amount per category (e.g. "MARITIME" → {count, montant}) */
    private List<CategoryStat> byCategory;

    /** Count per compagne name */
    private List<LabelValue> byCompagne;

    /** Productions per month (last 12 months), key = "YYYY-MM" */
    private List<LabelValue> byMonth;

    // ── Recent data ───────────────────────────────────────────────────────────
    /** Last 5 productions (most recent first) */
    private List<RecentProduction> recentProductions;

    // ── Nested types ──────────────────────────────────────────────────────────
    @Data @Builder
    public static class CategoryStat {
        private String category;
        private long count;
        private double montant;
    }

    @Data @Builder
    public static class LabelValue {
        private String label;
        private double value;
    }

    @Data @Builder
    public static class RecentProduction {
        private String id;
        private String numpolice;
        private String client;
        private String category;
        private String compagne;
        private double montant;
        private String dateEff;
        private String reglementStatus; // EN_ATTENTE, PARTIEL, PAYE, or null
    }
}
