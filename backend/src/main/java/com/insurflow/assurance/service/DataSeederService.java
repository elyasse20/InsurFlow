package com.insurflow.assurance.service;

import com.insurflow.assurance.model.*;
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
    private final ParametreRepository parametreRepository;
    private final TvaRepository tvaRepository;
    private final InvoiceService invoiceService;

    /**
     * Seeds complete realistic Moroccan insurance data into MongoDB for multi-exercices (2023, 2024, 2025, 2026).
     * @param resetExisting If true, clears existing records before seeding.
     * @return Map containing statistics of inserted records.
     */
    public Map<String, Object> seedMockData(boolean resetExisting) {
        log.info("Starting Multi-Exercice DataSeeder for InsurFlow (2023, 2024, 2025, 2026)... resetExisting={}", resetExisting);

        if (resetExisting) {
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

        // 5. Seed Multi-Exercices
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

        log.info("✓ DataSeeder completed! Created {} clients, {} compagnes, {} productions, {} reglements.",
                clients.size(), compagnes.size(), allProductions.size(), allReglements.size());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("exercices", List.of(2023, 2024, 2025, 2026));
        result.put("compagnesCreated", compagnes.size());
        result.put("clientsCreated", clients.size());
        result.put("productionsCreated", allProductions.size());
        result.put("reglementsCreated", allReglements.size());
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

        int policyIndex = 1;

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

                String numpolice = String.format("POL-%04d-%03d", year, policyIndex);
                String numFacture = String.format("FAC-%04d-%03d", year, policyIndex);

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
                        .ordre(String.valueOf(70000 + (year % 100) * 1000 + policyIndex))
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
                            .numero(String.format("CHQ-%06d", 800000 + (year % 100) * 1000 + policyIndex))
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
                            .numero(String.format("CHQ-%06d", 800000 + (year % 100) * 1000 + policyIndex))
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

                policyIndex++;
            }
        }
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
