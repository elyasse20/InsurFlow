package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.ClaimAnalysisRequest;
import com.insurflow.assurance.dto.ClaimAnalysisResponse;
import com.insurflow.assurance.dto.FinancialBreakdownDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class AiClaimAnalysisService {

    /**
     * Analyzes insurance claims statements, constats amiables, and accident reports.
     * Evaluates liability, financial impact, and fraud indicators under Moroccan regulations (ACAPS / Loi 17-99).
     */
    public ClaimAnalysisResponse analyzeClaim(ClaimAnalysisRequest request) {
        log.info("Analyzing insurance claim for client: {}, policy: {}",
                request.getClientName(), request.getPolicyNumber());

        return evaluateRuleEngine(request);
    }

    /**
     * Deterministic insurance analytics and fraud detection engine.
     */
    public ClaimAnalysisResponse evaluateRuleEngine(ClaimAnalysisRequest req) {
        String text = (req.getClaimText() != null) ? req.getClaimText().trim() : "";
        String tLower = text.toLowerCase();

        int fraudScore = 15; // baseline low risk
        List<String> riskFlags = new ArrayList<>();
        List<String> recommendedActions = new ArrayList<>();

        // Financial defaults
        double estimatedDamage = req.getEstimatedDamage() != null ? req.getEstimatedDamage() : 8500.0;
        double deductible = req.getDeductible() != null ? req.getDeductible() : 1500.0;

        // Try extracting amount from text if not explicitly provided
        if (req.getEstimatedDamage() == null) {
            java.util.regex.Matcher amountMatcher = java.util.regex.Pattern.compile("(\\d+[\\s\\d]*[\\.,]?\\d*)\\s*(?:dh|mad|dhs)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(text);
            if (amountMatcher.find()) {
                try {
                    String clean = amountMatcher.group(1).replaceAll("\\s+", "").replace(',', '.');
                    estimatedDamage = Double.parseDouble(clean);
                } catch (Exception ignored) {}
            }
        }

        // ── 1. Anomaly & Fraud Indicator Heuristics ───────────────────────────
        boolean isSoloNoThirdParty = tLower.contains("sans tiers") || tLower.contains("aucun tiers") ||
                tLower.contains("seul") || tLower.contains("obstacle fixe") || tLower.contains("arbre") ||
                tLower.contains("poteau") || tLower.contains("trottoir") || tLower.contains("parking") && !tLower.contains("véhicule b");

        boolean isLateDeclaration = tLower.contains("retard") || tLower.contains("10 jours") ||
                tLower.contains("15 jours") || tLower.contains("3 semaines") || tLower.contains("mois dernier") ||
                tLower.contains("tardive");

        boolean isTheftOrBreakIn = tLower.contains("vol") || tLower.contains("effraction") ||
                tLower.contains("vitre brisée") || tLower.contains("serrure forcée") || tLower.contains("disparition");

        boolean isChainCollision = tLower.contains("chaîne") || tLower.contains("chaine") ||
                tLower.contains("carambolage") || tLower.contains("arrière") || tLower.contains("freinage d'urgence");

        boolean isRecentSubscription = tLower.contains("récent") || tLower.contains("souscrit hier") ||
                tLower.contains("nouvelle police") || tLower.contains("premier mois") || tLower.contains("3 jours");

        boolean isAlcoholOrDispute = tLower.contains("alcool") || tLower.contains("ivresse") ||
                tLower.contains("délit de fuite") || tLower.contains("refus de signer") || tLower.contains("conteste");

        // Risk Scoring computation
        if (isSoloNoThirdParty) {
            fraudScore += 25;
            riskFlags.add("Accident sans tiers identifié en stationnement / choc isolé (Vérifier absence de tentative de maquillage).");
        }

        if (isLateDeclaration) {
            fraudScore += 20;
            riskFlags.add("Déclaration tardive > 5 jours ouvrés (Article 20 de la Loi n° 17-99 régissant les délais de notification).");
            recommendedActions.add("Vérifier le motif légal du retard de déclaration (Cas fortuit ou force majeure selon Loi 17-99).");
        }

        if (isRecentSubscription) {
            fraudScore += 30;
            riskFlags.add("Sinistre survenu à proximité immédiate de la souscription du contrat (Indicateur d'antériorité possible).");
            recommendedActions.add("Vérifier la date et l'heure exactes de paiement de la quittance initiale avant l'heure du sinistre.");
        }

        if (isAlcoholOrDispute) {
            fraudScore += 35;
            riskFlags.add("Délit de fuite / Refus de constat ou suspicion d'infraction pénale au Code de la Route.");
            recommendedActions.add("Exiger la communication du Procès-Verbal officiel de Police / Gendarmerie Royale.");
        }

        if (isTheftOrBreakIn) {
            fraudScore += 15;
            riskFlags.add("Sinistre de type Vol / Effraction : Nécessité de dépôt de plainte formel auprès des autorités.");
            recommendedActions.add("Exiger l'original du récépissé de dépôt de plainte de police et les deux jeux de clés originaux.");
        }

        if (isChainCollision) {
            fraudScore -= 5;
            riskFlags.add("Accident en chaîne à cinématique cohérente (Multiples témoins et tiers identifiés).");
        }

        // Clamp fraud score
        fraudScore = Math.max(5, Math.min(95, fraudScore));

        String fraudLevel;
        if (fraudScore < 35) {
            fraudLevel = "FAIBLE";
        } else if (fraudScore < 65) {
            fraudLevel = "MOYEN";
        } else {
            fraudLevel = "ÉLEVÉ";
        }

        // ── 2. Liability & ACAPS Legal Assessment ──────────────────────────────
        String liabilityAssessment;
        if (isChainCollision) {
            liabilityAssessment = "0% Responsable (Recours total 100% contre le véhicule suiveur responsable du carambolage selon la Convention CISA/CID).";
        } else if (isSoloNoThirdParty) {
            liabilityAssessment = "100% Responsable (Perte de contrôle / Stationnement sans tiers). Garantie Dommages au Véhicule / Tous Risques requise avec application de franchise.";
        } else if (isTheftOrBreakIn) {
            liabilityAssessment = "Non applicable (Sinistre Vol/Vandalisme). Couverture au titre de la garantie Vol & Effraction sous réserve d'expertise préalable.";
        } else if (tLower.contains("refus de priorité") || tLower.contains("stop") || tLower.contains("feu rouge")) {
            liabilityAssessment = "Responsabilité déterminée selon le constat : Priorité à droite / Non-respect du panneau de signalisation (Barème ACAPS Cas N° 10 / Recours 100%).";
        } else {
            liabilityAssessment = "Responsabilité partagée sous réserve de l'examen des croix cochées sur le constat amiable (Barème ACAPS Conventionnel).";
        }

        // ── 3. Financial Breakdown ─────────────────────────────────────────────
        double netPayout = Math.max(0.0, estimatedDamage - deductible);
        FinancialBreakdownDto breakdown = FinancialBreakdownDto.builder()
                .estimatedDamage(estimatedDamage)
                .deductible(deductible)
                .netPayout(netPayout)
                .currency("MAD")
                .notes("Calcul net d'indemnisation après imputation de la franchise contractuelle.")
                .build();

        // ── 4. Standard Action Steps ──────────────────────────────────────────
        if (recommendedActions.isEmpty()) {
            recommendedActions.add("Mandater un expert automobile agréé ACAPS pour chiffrage contradictoire.");
            recommendedActions.add("Vérifier la validité des quittances et le paiement de la prime à date du sinistre.");
            recommendedActions.add("Enregistrer l'ouverture de dossier dans le module Sinistres et notifier la compagnie apéritrice.");
        } else {
            recommendedActions.add("Mandater un expert automobile agréé ACAPS pour vérification de conformité des points de choc.");
            recommendedActions.add("Notifier la compagnie d'assurance avec mention des réserves d'usage.");
        }

        // ── 5. Executive Summary ──────────────────────────────────────────────
        String client = req.getClientName() != null ? req.getClientName() : "Assuré InsurFlow";
        String policy = req.getPolicyNumber() != null ? req.getPolicyNumber() : "POL-" + java.time.Year.now().getValue() + "-SN";
        String date = req.getIncidentDate() != null ? req.getIncidentDate() : java.time.LocalDate.now().toString();

        String summary = String.format(
                "Déclaration de sinistre enregistrée pour le client **%s** (Police n° **%s**). Événement survenu le %s.\n\n" +
                "• **Type d'incident :** %s\n" +
                "• **Description des faits :** %s\n" +
                "• **Impact financier estimé :** %s MAD (Franchise contractuelle : %s MAD).",
                client, policy, date,
                (isChainCollision ? "Accident en chaîne sur voie rapide" : isTheftOrBreakIn ? "Vol / Effraction matérielle" : isSoloNoThirdParty ? "Choc isolé / Sans tiers identifié" : "Collision matérielle standard"),
                (text.length() > 180 ? text.substring(0, 175) + "..." : text.isEmpty() ? "Déclaration standard enregistrée" : text),
                String.format("%,.2f", estimatedDamage),
                String.format("%,.2f", deductible)
        );

        return ClaimAnalysisResponse.builder()
                .executiveSummary(summary)
                .liabilityAssessment(liabilityAssessment)
                .financialBreakdown(breakdown)
                .fraudRiskScore(fraudScore)
                .fraudRiskLevel(fraudLevel)
                .riskFlags(riskFlags)
                .recommendedActions(recommendedActions)
                .build();
    }
}
