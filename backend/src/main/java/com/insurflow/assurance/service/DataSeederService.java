package com.insurflow.assurance.service;

import com.insurflow.assurance.model.*;
import com.insurflow.assurance.model.Sinistre.SinistreStatus;
import com.insurflow.assurance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataSeederService {

    private final CompagneRepository compagneRepository;
    private final CategoryRepository categoryRepository;
    private final NatureRepository natureRepository;
    private final ClientRepository clientRepository;
    private final ProductionRepository productionRepository;
    private final ReglementRepository reglementRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationRepository notificationRepository;
    private final SinistreRepository sinistreRepository;
    private final ParametreRepository parametreRepository;
    private final TvaRepository tvaRepository;
    private final InvoiceService invoiceService;

    /**
     * Extracts a clean, normalized trigram or uppercase code from a company name.
     * e.g. "AtlantaSanad Assurance" -> "ATLANTA", "Sanlam Maroc" -> "SANLAM", "Wafa Assurance" -> "WAFA"
     */
    public static String extractCompanyCode(String companyName) {
        if (companyName == null || companyName.trim().isEmpty()) return "CIE";
        String clean = companyName.toUpperCase().trim();
        if (clean.contains("ATLANTA")) return "ATLANTA";
        if (clean.contains("SANLAM")) return "SANLAM";
        if (clean.contains("WAFA")) return "WAFA";
        if (clean.contains("RMA")) return "RMA";
        if (clean.contains("ALLIANZ")) return "ALLIANZ";
        if (clean.contains("AXA")) return "AXA";
        if (clean.contains("TAOUNATE")) return "TAOUNATE";
        if (clean.contains("CHAABI")) return "CHAABI";

        String[] parts = clean.replaceAll("[^A-Z0-9\\s]", "").trim().split("\\s+");
        return (parts.length > 0 && parts[0].length() >= 2) ? parts[0] : "CIE";
    }

    /**
     * Normalizes and migrates all existing policy numbers across MongoDB collections
     * (productions, regelements, invoices, notifications) into the standardized format
     * POL-{COMPAGNIE}-{ANNEE}-{00X}.
     *
     * @return Map with migration statistics.
     */
    public Map<String, Object> migrateAndNormalizePolicyNumbers() {
        log.info("Starting Policy Number Migration to standardized nomenclature POL-{COMPAGNIE}-{ANNEE}-{00X}...");

        List<Production> allProductions = productionRepository.findAll();
        // Sort chronologically by dateEff / createdAt
        allProductions.sort((p1, p2) -> {
            LocalDate d1 = p1.getDateEff() != null ? p1.getDateEff() : LocalDate.of(p1.getExercice() != null ? p1.getExercice() : 2026, 1, 1);
            LocalDate d2 = p2.getDateEff() != null ? p2.getDateEff() : LocalDate.of(p2.getExercice() != null ? p2.getExercice() : 2026, 1, 1);
            int cmp = d1.compareTo(d2);
            if (cmp != 0) return cmp;
            if (p1.getCreatedAt() != null && p2.getCreatedAt() != null) {
                return p1.getCreatedAt().compareTo(p2.getCreatedAt());
            }
            return (p1.getId() != null && p2.getId() != null) ? p1.getId().compareTo(p2.getId()) : 0;
        });

        Map<String, Integer> companyYearCounters = new HashMap<>();
        Map<String, String> prodIdToNewPolicy = new HashMap<>();
        Map<String, String> oldPolicyToNewPolicy = new HashMap<>();

        int prodsMigrated = 0;

        for (Production prod : allProductions) {
            String compCode = extractCompanyCode(prod.getCompagne());
            int year = prod.getExercice() != null ? prod.getExercice() : (prod.getDateEff() != null ? prod.getDateEff().getYear() : 2026);

            String key = compCode + "-" + year;
            int seq = companyYearCounters.compute(key, (k, v) -> v == null ? 1 : v + 1);
            String targetPolicy = String.format("POL-%s-%04d-%03d", compCode, year, seq);

            String oldPolicy = prod.getNumpolice();
            prodIdToNewPolicy.put(prod.getId(), targetPolicy);
            if (oldPolicy != null && !oldPolicy.trim().isEmpty()) {
                oldPolicyToNewPolicy.put(oldPolicy, targetPolicy);
            }

            if (!targetPolicy.equals(oldPolicy)) {
                prod.setNumpolice(targetPolicy);
                productionRepository.save(prod);
                prodsMigrated++;
            }
        }

        // Cascade to Reglements
        int reglementsMigrated = 0;
        List<Reglement> allReglements = reglementRepository.findAll();
        for (Reglement reg : allReglements) {
            String newPolicy = null;
            if (reg.getProduction() != null && prodIdToNewPolicy.containsKey(reg.getProduction().getId())) {
                newPolicy = prodIdToNewPolicy.get(reg.getProduction().getId());
            } else if (reg.getNumpolice() != null && oldPolicyToNewPolicy.containsKey(reg.getNumpolice())) {
                newPolicy = oldPolicyToNewPolicy.get(reg.getNumpolice());
            }

            if (newPolicy != null && !newPolicy.equals(reg.getNumpolice())) {
                reg.setNumpolice(newPolicy);
                reglementRepository.save(reg);
                reglementsMigrated++;
            }
        }

        // Cascade to Invoices
        int invoicesMigrated = 0;
        List<Invoice> allInvoices = invoiceRepository.findAll();
        for (Invoice inv : allInvoices) {
            String newPolicy = null;
            if (inv.getOperationId() != null && prodIdToNewPolicy.containsKey(inv.getOperationId())) {
                newPolicy = prodIdToNewPolicy.get(inv.getOperationId());
            } else if (inv.getPolicyNumber() != null && oldPolicyToNewPolicy.containsKey(inv.getPolicyNumber())) {
                newPolicy = oldPolicyToNewPolicy.get(inv.getPolicyNumber());
            }

            if (newPolicy != null && !newPolicy.equals(inv.getPolicyNumber())) {
                inv.setPolicyNumber(newPolicy);
                invoiceRepository.save(inv);
                invoicesMigrated++;
            }
        }

        // Cascade to Notifications
        int notificationsMigrated = 0;
        List<Notification> allNotifs = notificationRepository.findAll();
        for (Notification notif : allNotifs) {
            String newPolicy = null;
            if (notif.getReferenceId() != null && prodIdToNewPolicy.containsKey(notif.getReferenceId())) {
                newPolicy = prodIdToNewPolicy.get(notif.getReferenceId());
            } else if (notif.getPolicyNumber() != null && oldPolicyToNewPolicy.containsKey(notif.getPolicyNumber())) {
                newPolicy = oldPolicyToNewPolicy.get(notif.getPolicyNumber());
            }

            if (newPolicy != null && !newPolicy.equals(notif.getPolicyNumber())) {
                notif.setPolicyNumber(newPolicy);
                notificationRepository.save(notif);
                notificationsMigrated++;
            }
        }

        log.info("✓ Policy number migration completed! Total: {} productions ({} updated), {} reglements, {} invoices, {} notifications.",
                allProductions.size(), prodsMigrated, reglementsMigrated, invoicesMigrated, notificationsMigrated);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("totalProductions", allProductions.size());
        result.put("productionsMigrated", prodsMigrated);
        result.put("reglementsMigrated", reglementsMigrated);
        result.put("invoicesMigrated", invoicesMigrated);
        result.put("notificationsMigrated", notificationsMigrated);
        return result;
    }

    /**
     * Seeds complete realistic Moroccan insurance data into MongoDB for multi-exercices (2023, 2024, 2025, 2026).
     * @param resetExisting If true, clears existing records before seeding.
     * @return Map containing statistics of inserted records.
     */
    public Map<String, Object> seedMockData(boolean resetExisting) {
        log.info("Starting Multi-Exercice DataSeeder for InsurFlow (2023, 2024, 2025, 2026)... resetExisting={}", resetExisting);

        if (resetExisting) {
            sinistreRepository.deleteAll();
            notificationRepository.deleteAll();
            invoiceRepository.deleteAll();
            reglementRepository.deleteAll();
            productionRepository.deleteAll();
            clientRepository.deleteAll();
            compagneRepository.deleteAll();
            categoryRepository.deleteAll();
            natureRepository.deleteAll();
            log.info("Cleared existing database collections for fresh multi-year seed.");
        }

        // 1. Seed Natures
        List<Nature> natures = seedNatures();

        // 2. Seed Categories
        List<Category> categories = seedCategories();

        // 3. Seed Compagnies d'Assurance
        List<Compagne> compagnes = seedCompagnes();

        // 4. Seed Clients (Particuliers & Sociétés)
        List<Client> clients = seedClients();

        // 5. Seed Multi-Exercices Productions & Reglements
        List<Production> allProductions = new ArrayList<>();
        List<Reglement> allReglements = new ArrayList<>();

        Random random = new Random(42); // Deterministic seed for reproducible testing

        // Exercice 2023: ~25 operations, total ~420 000 DH, ~85% settled
        seedExercice(2023, 25, 420_000.0, 0.85, natures, categories, compagnes, clients, allProductions, allReglements, random);

        // Exercice 2024: ~35 operations, total ~590 000 DH, ~80% settled
        seedExercice(2024, 35, 590_000.0, 0.80, natures, categories, compagnes, clients, allProductions, allReglements, random);

        // Exercice 2025: ~40 operations, total ~710 000 DH, ~75% settled
        seedExercice(2025, 40, 710_000.0, 0.75, natures, categories, compagnes, clients, allProductions, allReglements, random);

        // Exercice 2026: ~20 operations, total ~350 000 DH, ~65% settled
        seedExercice(2026, 20, 350_000.0, 0.65, natures, categories, compagnes, clients, allProductions, allReglements, random);

        // 6. Seed Realistic Demonstration Sinistres
        List<Sinistre> sinistres = seedSinistres(clients, allProductions);

        log.info("✓ DataSeeder completed! Created {} clients, {} compagnes, {} productions, {} reglements, {} sinistres.",
                clients.size(), compagnes.size(), allProductions.size(), allReglements.size(), sinistres.size());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("exercices", List.of(2023, 2024, 2025, 2026));
        result.put("compagnesCreated", compagnes.size());
        result.put("clientsCreated", clients.size());
        result.put("productionsCreated", allProductions.size());
        result.put("reglementsCreated", allReglements.size());
        result.put("sinistresCreated", sinistres.size());
        return result;
    }

    private void seedExercice(
            int year,
            int totalOperations,
            double targetTotalPrimesTTC,
            double targetSettlementRate,
            List<Nature> natures,
            List<Category> categories,
            List<Compagne> compagnes,
            List<Client> clients,
            List<Production> allProductions,
            List<Reglement> allReglements,
            Random random
    ) {
        String[] banks = {"Attijariwafa Bank", "Banque Populaire", "BMCE Bank (Bank of Africa)", "CIH Bank", "Crédit du Maroc", "Société Générale Maroc"};
        double avgTTCPerOp = targetTotalPrimesTTC / totalOperations;
        double avgBasePrime = avgTTCPerOp / 1.16; // approx before 14% TVA + taxes/accessories

        int opsPerMonthBase = totalOperations / 12;
        int remainingOps = totalOperations % 12;

        Map<String, Integer> compPolicyCounters = new HashMap<>();
        int invoiceIndex = 1;

        for (int month = 1; month <= 12; month++) {
            int opsInMonth = opsPerMonthBase + (month <= remainingOps ? 1 : 0);
            if (opsInMonth < 1) opsInMonth = 1; // Ensure every single month has at least 1-2 operations

            for (int i = 0; i < opsInMonth; i++) {
                int day = 1 + random.nextInt(26);
                LocalDate dateEff = LocalDate.of(year, month, day);
                String moisDem = String.format("%04d-%02d", year, month);

                Client client = clients.get(random.nextInt(clients.size()));
                Compagne compagne = compagnes.get(random.nextInt(compagnes.size()));
                Category category = categories.get(random.nextInt(categories.size()));
                Nature nature = natures.get(random.nextInt(natures.size()));

                String clientDisplayName = client.getType() == Client.ClientType.particulier
                        ? client.getPrenom() + " " + client.getNom()
                        : client.getNom();

                String compCode = extractCompanyCode(compagne.getCompagneName());
                int compSeq = compPolicyCounters.compute(compCode + "-" + year, (k, v) -> v == null ? 1 : v + 1);

                // Standardized Policy Number Format: POL-{COMPAGNIE}-{ANNEE}-{00X}
                String numpolice = String.format("POL-%s-%04d-%03d", compCode, year, compSeq);
                String numFacture = String.format("FAC-%04d-%03d", year, invoiceIndex);

                // Multiplier based on category
                double catMultiplier = 1.0;
                if ("MARITIME".equals(category.getName())) catMultiplier = 2.2;
                else if ("MULT".equals(category.getName())) catMultiplier = 1.6;
                else if ("RC".equals(category.getName())) catMultiplier = 1.3;
                else if ("SANT INTER".equals(category.getName())) catMultiplier = 1.1;

                if (client.getType() == Client.ClientType.societe) catMultiplier *= 1.4;

                // Slight random variance around avg
                double variance = 0.75 + (random.nextDouble() * 0.5);
                double basePrime = Math.round((avgBasePrime * catMultiplier * variance) * 100.0) / 100.0;

                double tvaRate = 14.0;
                double taxe = Math.round((basePrime * (tvaRate / 100.0)) * 100.0) / 100.0;
                double taxepara = Math.round((basePrime * 0.015) * 100.0) / 100.0;
                double accessoire = 120.0 + random.nextInt(4) * 40.0;
                double cnpc = 35.0;
                double commission = Math.round((basePrime * (category.getCommissionRate() / 100.0)) * 100.0) / 100.0;

                ProductionParameter param = ProductionParameter.builder()
                        .name("PRIME PRINCIPALE")
                        .primes(basePrime)
                        .taxe(taxe)
                        .taxepara(taxepara)
                        .accessoire(accessoire)
                        .cnpc(cnpc)
                        .commission(commission)
                        .build();

                LocalDateTime createdAt = dateEff.atTime(8 + random.nextInt(10), random.nextInt(60));

                Production prod = Production.builder()
                        .natureOperation(nature.getName())
                        .client(clientDisplayName)
                        .dateEff(dateEff)
                        .moisDem(moisDem)
                        .compagne(compagne.getCompagneName())
                        .category(category.getName())
                        .tvaRate(tvaRate)
                        .numpolice(numpolice)
                        .ordre(String.valueOf(70000 + (year % 100) * 1000 + invoiceIndex))
                        .parameters(List.of(param))
                        .createdAt(createdAt)
                        .updatedAt(createdAt)
                        .build();

                Production savedProd = productionRepository.save(prod);
                allProductions.add(savedProd);

                // Settlement status based on targetSettlementRate
                double montantTotal = savedProd.getMontantTotal();
                Reglement.ReglementStatus status;
                List<Payment> clientPayments = new ArrayList<>();

                double roll = random.nextDouble();
                if (roll < targetSettlementRate) {
                    status = Reglement.ReglementStatus.PAYE;
                    Payment pmt = Payment.builder()
                            .mode(random.nextBoolean() ? Payment.PaymentMode.CHEQUE : Payment.PaymentMode.VIREMENT)
                            .montant(montantTotal)
                            .banque(banks[random.nextInt(banks.length)])
                            .numero(String.format("CHQ-%06d", 800000 + (year % 100) * 1000 + invoiceIndex))
                            .dateEcheance(dateEff.plusDays(10))
                            .dateVirement(dateEff.plusDays(5))
                            .commentaire("Règlement intégral reçu")
                            .build();
                    clientPayments.add(pmt);
                } else if (roll < targetSettlementRate + 0.12) {
                    status = Reglement.ReglementStatus.PARTIEL;
                    double partialAmount = Math.round(montantTotal * 0.5 * 100.0) / 100.0;
                    Payment pmt = Payment.builder()
                            .mode(Payment.PaymentMode.CHEQUE)
                            .montant(partialAmount)
                            .banque(banks[random.nextInt(banks.length)])
                            .numero(String.format("CHQ-%06d", 800000 + (year % 100) * 1000 + invoiceIndex))
                            .dateEcheance(dateEff.plusDays(15))
                            .commentaire("Acompte partiel encaissé")
                            .build();
                    clientPayments.add(pmt);
                } else {
                    status = Reglement.ReglementStatus.EN_ATTENTE;
                }

                Reglement reglement = Reglement.builder()
                        .production(savedProd)
                        .natureOperation(nature.getName())
                        .client(clientDisplayName)
                        .dateEff(dateEff)
                        .moisDem(moisDem)
                        .compagne(compagne.getCompagneName())
                        .category(category.getName())
                        .numpolice(numpolice)
                        .numFacture(numFacture)
                        .montantTotal(montantTotal)
                        .status(status)
                        .payments(clientPayments)
                        .createdAt(createdAt)
                        .updatedAt(createdAt)
                        .build();

                allReglements.add(reglementRepository.save(reglement));

                // Generate matching invoice for this operation
                try {
                    invoiceService.generateInvoiceForOperation(savedProd.getId());
                } catch (Exception e) {
                    log.warn("Could not generate invoice for production {}: {}", savedProd.getId(), e.getMessage());
                }

                invoiceIndex++;
            }
        }
    }

    public List<Sinistre> seedSinistres(List<Client> clients, List<Production> productions) {
        if (sinistreRepository.count() > 0) return sinistreRepository.findAll();

        log.info("Seeding 6 realistic Moroccan insurance demonstration claims (Sinistres)...");

        List<Sinistre> list = List.of(
                // 1. Collision arrière autoroute (Non responsable 0%)
                Sinistre.builder()
                        .sinistreNumber("SIN-2026-0001")
                        .clientName("Société Maghreb Contracting SA")
                        .policyNumber("POL-ATLANTA-2026-001")
                        .compagne("AtlantaSanad Assurance")
                        .category("AUTOMOBILE")
                        .incidentDate(LocalDate.of(2026, 8, 23))
                        .declarationDate(LocalDate.of(2026, 8, 24))
                        .claimText("Autoroute Casablanca - Rabat, PK 45. Fort ralentissement dû à un bouchon. Le véhicule A (notre assuré) s'est arrêté normalement. Le véhicule B (tiers immatriculé 12345-A-6) n'a pas maîtrisé son freinage et a percuté violemment l'arrière du véhicule A, le projetant sur le véhicule C. Constat amiable contradictoire signé avec mention choc arrière.")
                        .status(SinistreStatus.EN_EXPERTISE)
                        .fraudRiskScore(12)
                        .fraudRiskLevel("FAIBLE")
                        .liabilityAssessment("0% Responsable (Recours total 100% contre le véhicule suiveur tiers responsable du carambolage selon Convention CISA/CID).")
                        .liabilityRate(0)
                        .estimatedDamage(18500.0)
                        .deductible(2000.0)
                        .netPayout(16500.0)
                        .riskFlags(List.of("Cinématique cohérente avec multiples témoins et tiers identifié.", "Constat amiable signé sans réserves."))
                        .recommendedActions(List.of("Mandater un expert agréé ACAPS pour chiffrage contradictoire.", "Engager le recours subrogatoire contre la compagnie adverse.", "Enregistrer l'ouverture de dossier dans le module Sinistres."))
                        .executiveSummary("Carambolage en chaîne sur autoroute. Assuré percuté à l'arrêt complet. Dégâts importants malle arrière et pare-chocs. Responsabilité adverse totale engagée.")
                        .createdAt(LocalDateTime.of(2026, 8, 24, 10, 15))
                        .updatedAt(LocalDateTime.of(2026, 8, 24, 10, 15))
                        .build(),

                // 2. Choc stationnement sans tiers (Responsable 100%)
                Sinistre.builder()
                        .sinistreNumber("SIN-2026-0002")
                        .clientName("Youssef EL MANSOURI")
                        .policyNumber("POL-SANLAM-2026-001")
                        .compagne("Sanlam Maroc")
                        .category("AUTOMOBILE")
                        .incidentDate(LocalDate.of(2026, 8, 20))
                        .declarationDate(LocalDate.of(2026, 8, 21))
                        .claimText("Véhicule retrouvé avec une aile avant gauche et portière embouties sur le parking d'un supermarché à Casablanca. Aucun témoin ni tiers identifié. Déclaration effectuée sous 48h.")
                        .status(SinistreStatus.DECLARE)
                        .fraudRiskScore(42)
                        .fraudRiskLevel("MOYEN")
                        .liabilityAssessment("100% Responsable (Choc stationnement sans tiers identifié). Prise en charge au titre de la garantie Tous Risques sous déduction de la franchise contractuelle.")
                        .liabilityRate(100)
                        .estimatedDamage(9200.0)
                        .deductible(1500.0)
                        .netPayout(7700.0)
                        .riskFlags(List.of("Accident sans tiers identifié en stationnement (Vérifier absence d'antériorité).", "Déclaration conforme dans le délai légal de 5 jours."))
                        .recommendedActions(List.of("Exiger les photos horodatées des points de choc.", "Vérifier la validité de la garantie Tous Risques au jour du sinistre."))
                        .executiveSummary("Dégâts carrosserie en stationnement sans tiers. Dossier éligible à indemnisation après franchise.")
                        .createdAt(LocalDateTime.of(2026, 8, 21, 14, 30))
                        .updatedAt(LocalDateTime.of(2026, 8, 21, 14, 30))
                        .build(),

                // 3. Avarie particulière transport maritime
                Sinistre.builder()
                        .sinistreNumber("SIN-2026-0003")
                        .clientName("Atlas Logistique & Transport SARL")
                        .policyNumber("POL-RMA-2026-001")
                        .compagne("RMA (Royale Marocaine d'Assurances)")
                        .category("MARITIME")
                        .incidentDate(LocalDate.of(2026, 8, 14))
                        .declarationDate(LocalDate.of(2026, 8, 15))
                        .claimText("Avarie conteneur frigorifique lors de la traversée Algésiras - Tanger Med due à une forte houle. Infiltration d'eau de mer constatée au dépotage. Récépissé d'avaries contradictoire dressé par le commissaire d'avaries maritime.")
                        .status(SinistreStatus.INDEMNISE)
                        .fraudRiskScore(8)
                        .fraudRiskLevel("FAIBLE")
                        .liabilityAssessment("Non applicable (Avarie particulière maritime couverte par la police Faculté Maritime sous certificat d'avarie).")
                        .liabilityRate(0)
                        .estimatedDamage(42000.0)
                        .deductible(5000.0)
                        .netPayout(37000.0)
                        .riskFlags(List.of("Certificat d'avaries maritimes officiel délivré par le Lloyd's Agent.", "Manifeste de bord et connaissement conformes."))
                        .recommendedActions(List.of("Clôturer le règlement suite au virement de l'indemnité nette à l'assuré."))
                        .executiveSummary("Avarie maritime constatée à Tanger Med. Indemnité de 37 000 DH versée après déduction de la franchise.")
                        .createdAt(LocalDateTime.of(2026, 8, 15, 9, 0))
                        .updatedAt(LocalDateTime.of(2026, 8, 28, 16, 45))
                        .build(),

                // 4. Dégât des eaux local commercial / Multirisque Pro
                Sinistre.builder()
                        .sinistreNumber("SIN-2026-0004")
                        .clientName("Travaux Généraux Atlas SARL")
                        .policyNumber("POL-WAFA-2026-001")
                        .compagne("Wafa Assurance")
                        .category("MULT")
                        .incidentDate(LocalDate.of(2026, 8, 5))
                        .declarationDate(LocalDate.of(2026, 8, 6))
                        .claimText("Inondation des bureaux du rez-de-chaussée suite à la rupture de la conduite d'alimentation principale du bâtiment voisin. Matériel informatique et mobilier de bureau endommagés.")
                        .status(SinistreStatus.INDEMNISE)
                        .fraudRiskScore(14)
                        .fraudRiskLevel("FAIBLE")
                        .liabilityAssessment("0% Responsable (Dégât des eaux causé par un tiers contigu). Recours exercé et obtenu contre le syndic de copropriété adverse.")
                        .liabilityRate(0)
                        .estimatedDamage(65000.0)
                        .deductible(8000.0)
                        .netPayout(57000.0)
                        .riskFlags(List.of("Constat d'huissier et rapport d'expertise en plomberie fournis."))
                        .recommendedActions(List.of("Dossier régularisé et quittance de règlement signée."))
                        .executiveSummary("Dégât des eaux bureaux d'Anfa Casablanca. Recours intégral abouti et indemnisation effectuée.")
                        .createdAt(LocalDateTime.of(2026, 8, 6, 11, 20))
                        .updatedAt(LocalDateTime.of(2026, 8, 25, 12, 10))
                        .build(),

                // 5. Refus de priorité à droite (Non responsable 0%)
                Sinistre.builder()
                        .sinistreNumber("SIN-2026-0005")
                        .clientName("Karim BENJELLOUN")
                        .policyNumber("POL-ALLIANZ-2026-001")
                        .compagne("Allianz Maroc")
                        .category("AUTOMOBILE")
                        .incidentDate(LocalDate.of(2026, 7, 28))
                        .declarationDate(LocalDate.of(2026, 7, 29))
                        .claimText("Collision au carrefour Boulevard Mohammed V à Tanger. Le véhicule tiers n'a pas respecté la priorité à droite. Constat amiable contradictoire clair et signé par les deux conducteurs.")
                        .status(SinistreStatus.CLOTURE)
                        .fraudRiskScore(18)
                        .fraudRiskLevel("FAIBLE")
                        .liabilityAssessment("0% Responsable (Refus de priorité à droite par le véhicule adverse selon Barème ACAPS Cas N° 10 / Recours 100%).")
                        .liabilityRate(0)
                        .estimatedDamage(14000.0)
                        .deductible(2500.0)
                        .netPayout(11500.0)
                        .riskFlags(List.of("Constat amiable régulier avec croquis non contesté."))
                        .recommendedActions(List.of("Dossier clôturé après remboursement et recours auprès de la compagnie adverse."))
                        .executiveSummary("Accident de carrefour avec priorité à droite respectée par l'assuré. Recours total perçu.")
                        .createdAt(LocalDateTime.of(2026, 7, 29, 15, 0))
                        .updatedAt(LocalDateTime.of(2026, 8, 20, 10, 0))
                        .build(),

                // 6. Suspicion déclaration tardive et antériorité
                Sinistre.builder()
                        .sinistreNumber("SIN-2026-0006")
                        .clientName("Amina EL AMRANI")
                        .policyNumber("POL-AXA-2026-001")
                        .compagne("AXA Assurance Maroc")
                        .category("AUTOMOBILE")
                        .incidentDate(LocalDate.of(2026, 8, 10))
                        .declarationDate(LocalDate.of(2026, 8, 26))
                        .claimText("Déclaration d'un bris d'optiques de phares et vol partiel de nuit à Marrakech. Contrat souscrit il y a moins de 15 jours. Déclaration transmise avec 16 jours de retard sans motif justificatif.")
                        .status(SinistreStatus.DECLARE)
                        .fraudRiskScore(78)
                        .fraudRiskLevel("ÉLEVÉ")
                        .liabilityAssessment("En attente d'instruction (Déclaration tardive > 5 jours ouvrés selon l'Article 20 de la Loi n° 17-99 et suspicion d'antériorité du sinistre).")
                        .liabilityRate(50)
                        .estimatedDamage(28000.0)
                        .deductible(3000.0)
                        .netPayout(25000.0)
                        .riskFlags(List.of("Déclaration hors délai légal de 5 jours ouvrés (Article 20 de la Loi n° 17-99).", "Sinistre survenu à proximité immédiate de la date d'effet du contrat.", "Défaut de récépissé initial de dépôt de plainte."))
                        .recommendedActions(List.of("Notifier l'assuré avec réserves expresses de garantie pour forclusion légale.", "Mandater un expert enquêteur spécialisé en conformité des bris.", "Exiger la production du procès-verbal de gendarmerie / police."))
                        .executiveSummary("Alerte fraude élevée. Retard de déclaration supérieur à 15 jours et antériorité suspectée.")
                        .createdAt(LocalDateTime.of(2026, 8, 26, 17, 30))
                        .updatedAt(LocalDateTime.of(2026, 8, 26, 17, 30))
                        .build()
        );

        return sinistreRepository.saveAll(list);
    }

    private List<Nature> seedNatures() {
        if (natureRepository.count() > 0) return natureRepository.findAll();
        List<Nature> natures = List.of(
                Nature.builder().name("AFFAIRE NOUVELLE").build(),
                Nature.builder().name("RENOUVELLEMENT").build(),
                Nature.builder().name("AVENANT").build()
        );
        return natureRepository.saveAll(natures);
    }

    private List<Category> seedCategories() {
        if (categoryRepository.count() > 0) return categoryRepository.findAll();
        List<Category> categories = List.of(
                Category.builder().name("AUTOMOBILE").commissionRate(18.0).build(),
                Category.builder().name("MULT").commissionRate(22.0).build(),
                Category.builder().name("SANT INTER").commissionRate(12.0).build(),
                Category.builder().name("MARITIME").commissionRate(27.5).build(),
                Category.builder().name("RC").commissionRate(25.0).build(),
                Category.builder().name("AT").commissionRate(15.0).build()
        );
        return categoryRepository.saveAll(categories);
    }

    private List<Compagne> seedCompagnes() {
        if (compagneRepository.count() > 0) return compagneRepository.findAll();
        List<String> names = List.of(
                "AtlantaSanad Assurance",
                "Sanlam Maroc",
                "Wafa Assurance",
                "RMA (Royale Marocaine d'Assurances)",
                "AXA Assurance Maroc",
                "Allianz Maroc"
        );
        List<Compagne> list = names.stream()
                .map(n -> Compagne.builder().compagneName(n).build())
                .toList();
        return compagneRepository.saveAll(list);
    }

    private List<Client> seedClients() {
        if (clientRepository.count() > 0) return clientRepository.findAll();

        LocalDateTime dateStart = LocalDateTime.of(2023, 1, 1, 8, 30);

        List<Client> clients = List.of(
                // ── Particuliers ──
                Client.builder().type(Client.ClientType.particulier).nom("EL MANSOURI").prenom("Youssef").cin("AB654321").tel("+212 661-123456").adresse("125 Boulevard Zerktouni, Casablanca").budget(18000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("CHRAIBI").prenom("Fatima-Zohra").cin("CD987654").tel("+212 663-987654").adresse("45 Avenue Hassan II, Rabat").budget(24000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("BENJELLOUN").prenom("Karim").cin("BE456789").tel("+212 662-456789").adresse("12 Rue de la Liberté, Tanger").budget(20000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("EL AMRANI").prenom("Amina").cin("G789012").tel("+212 668-789012").adresse("88 Avenue Mohammed V, Marrakech").budget(32000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("BERRADA").prenom("Tariq").cin("K345678").tel("+212 667-345678").adresse("14 Rue Allal Ben Abdellah, Fès").budget(15000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("NACIRI").prenom("Houda").cin("HA123987").tel("+212 666-123987").adresse("30 Boulevard Hassan II, Agadir").budget(28000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("TAZI").prenom("Omar").cin("C456123").tel("+212 665-456123").adresse("56 Rue Mohamed Smiha, Casablanca").budget(45000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("ALAOUI").prenom("Salma").cin("D654987").tel("+212 664-554433").adresse("78 Boulevard Mohammed VI, Rabat").budget(26000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("SKALLI").prenom("Mehdi").cin("F321654").tel("+212 669-112233").adresse("22 Avenue des FAR, Casablanca").budget(35000).dateDebut(dateStart).build(),

                // ── Entreprises / Sociétés / SARL ──
                Client.builder().type(Client.ClientType.societe).nom("Société Maghreb Contracting SA").ice("001847593000045").identifiantFiscal("40283921").rc("128475 Casablanca").tel("+212 522-345678").adresse("Zone Industrielle Ain Sebaâ, Casablanca").budget(180000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Travaux Généraux Atlas SARL").ice("002498132000067").identifiantFiscal("49182304").rc("154982 Casablanca").tel("+212 522-654987").adresse("34 Boulevard d'Anfa, Casablanca").budget(210000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Atlas Logistique & Transport SARL").ice("002154879000032").identifiantFiscal("51294830").rc("98452 Tanger").tel("+212 539-876543").adresse("Zone Franche Tanger Med, Tanger").budget(260000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Pharmacie & Labo du Parc SARL").ice("001982734000012").identifiantFiscal("38472910").rc("65432 Rabat").tel("+212 537-654321").adresse("Avenue de France, Agdal, Rabat").budget(85000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("High Tech Trading SA").ice("002394857000088").identifiantFiscal("62938471").rc("145890 Casablanca").tel("+212 522-876543").adresse("Technopark, Route de Nouaceur, Casablanca").budget(120000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Souss Agro Export SARL").ice("001736254000077").identifiantFiscal("29384756").rc("43210 Agadir").tel("+212 528-234567").adresse("Zone Industrielle Ait Melloul, Agadir").budget(220000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Omnium Marocain de Pêche SA").ice("002874159000019").identifiantFiscal("73928104").rc("89234 Dakhla").tel("+212 528-892341").adresse("Port de Pêche, Dakhla").budget(310000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Casablanca Dental Clinic SARL").ice("002984123000055").identifiantFiscal("84920193").rc("189421 Casablanca").tel("+212 522-998877").adresse("18 Boulevard Massira Al Khadra, Casablanca").budget(95000).dateDebut(dateStart).build()
        );

        return clientRepository.saveAll(clients);
    }
}
