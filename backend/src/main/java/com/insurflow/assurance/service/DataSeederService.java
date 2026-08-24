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
    private final ParametreRepository parametreRepository;
    private final TvaRepository tvaRepository;
    private final InvoiceService invoiceService;

    /**
     * Seeds realistic Moroccan insurance data into MongoDB.
     * @param resetExisting If true, clears existing productions, reglements, clients, and compagnes before seeding.
     * @return Map containing statistics of inserted records.
     */
    public Map<String, Object> seedMockData(boolean resetExisting) {
        log.info("Starting DataSeeder for InsurFlow (Exercice 2026)... resetExisting={}", resetExisting);

        if (resetExisting) {
            reglementRepository.deleteAll();
            productionRepository.deleteAll();
            clientRepository.deleteAll();
            compagneRepository.deleteAll();
            categoryRepository.deleteAll();
            natureRepository.deleteAll();
            log.info("Cleared existing database collections for fresh seed.");
        }

        // 1. Seed Natures
        List<Nature> natures = seedNatures();

        // 2. Seed Categories
        List<Category> categories = seedCategories();

        // 3. Seed Compagnies d'Assurance
        List<Compagne> compagnes = seedCompagnes();

        // 4. Seed Clients (Particuliers & Sociétés)
        List<Client> clients = seedClients();

        // 5. Seed Productions & Règlements across all 12 months of 2026
        List<Production> productions = new ArrayList<>();
        List<Reglement> reglements = new ArrayList<>();

        Random random = new Random(42); // Fixed seed for reproducible realistic data
        int policyCounter = 1;

        // Data matrices for policy generation
        String[] banks = {"Attijariwafa Bank", "Banque Populaire", "BMCE Bank (Bank of Africa)", "CIH Bank", "Crédit du Maroc", "Société Générale Maroc"};
        
        // Loop over months 1 to 12 in 2026
        for (int month = 1; month <= 12; month++) {
            // Generate 3 to 4 policies per month
            int policiesInMonth = 3 + (month % 2);

            for (int i = 0; i < policiesInMonth; i++) {
                int day = 1 + random.nextInt(25);
                LocalDate dateEff = LocalDate.of(2026, month, day);
                String moisDem = String.format("2026-%02d", month);

                Client client = clients.get((policyCounter - 1) % clients.size());
                Compagne compagne = compagnes.get(random.nextInt(compagnes.size()));
                Category category = categories.get(random.nextInt(categories.size()));
                Nature nature = natures.get(random.nextInt(natures.size()));

                String clientDisplayName = client.getType() == Client.ClientType.particulier
                        ? client.getPrenom() + " " + client.getNom()
                        : client.getNom();

                String numpolice = String.format("POL-2026-%03d", policyCounter);
                String numFacture = String.format("FAC-2026-%03d", policyCounter);

                // Calculate realistic primes in MAD (DH)
                double basePrime = 2500.0 + random.nextInt(25) * 500.0;
                if ("MARITIME".equals(category.getName())) basePrime *= 2.5;
                if ("MULT".equals(category.getName())) basePrime *= 1.8;
                if (client.getType() == Client.ClientType.societe) basePrime *= 1.5;

                double tvaRate = 14.0;
                double taxe = basePrime * (tvaRate / 100.0);
                double taxepara = basePrime * 0.015; // 1.5%
                double accessoire = 150.0 + random.nextInt(4) * 50.0;
                double cnpc = 35.0;
                double commission = basePrime * (category.getCommissionRate() / 100.0);

                ProductionParameter param = ProductionParameter.builder()
                        .name("PRIME PRINCIPALE")
                        .primes(basePrime)
                        .taxe(taxe)
                        .taxepara(taxepara)
                        .accessoire(accessoire)
                        .cnpc(cnpc)
                        .commission(commission)
                        .build();

                LocalDateTime createdAt = dateEff.atTime(9 + random.nextInt(8), random.nextInt(60));

                Production prod = Production.builder()
                        .natureOperation(nature.getName())
                        .client(clientDisplayName)
                        .dateEff(dateEff)
                        .moisDem(moisDem)
                        .compagne(compagne.getCompagneName())
                        .category(category.getName())
                        .tvaRate(tvaRate)
                        .numpolice(numpolice)
                        .ordre(String.valueOf(74000 + policyCounter))
                        .parameters(List.of(param))
                        .createdAt(createdAt)
                        .updatedAt(createdAt)
                        .build();

                Production savedProd = productionRepository.save(prod);
                productions.add(savedProd);

                // Create matching Reglement with payment status breakdown (~60% PAYE, ~25% PARTIEL, ~15% EN_ATTENTE)
                double montantTotal = savedProd.getMontantTotal();
                Reglement.ReglementStatus status;
                List<Payment> clientPayments = new ArrayList<>();

                int statusRoll = random.nextInt(100);
                if (statusRoll < 60) {
                    status = Reglement.ReglementStatus.PAYE;
                    Payment pmt = Payment.builder()
                            .mode(random.nextBoolean() ? Payment.PaymentMode.CHEQUE : Payment.PaymentMode.VIREMENT)
                            .montant(montantTotal)
                            .banque(banks[random.nextInt(banks.length)])
                            .numero(String.format("CHQ-%06d", 800000 + policyCounter))
                            .dateEcheance(dateEff.plusDays(10))
                            .dateVirement(dateEff.plusDays(5))
                            .commentaire("Règlement intégral reçu")
                            .build();
                    clientPayments.add(pmt);
                } else if (statusRoll < 85) {
                    status = Reglement.ReglementStatus.PARTIEL;
                    double partialAmount = Math.round(montantTotal * 0.5 * 100.0) / 100.0;
                    Payment pmt = Payment.builder()
                            .mode(Payment.PaymentMode.CHEQUE)
                            .montant(partialAmount)
                            .banque(banks[random.nextInt(banks.length)])
                            .numero(String.format("CHQ-%06d", 800000 + policyCounter))
                            .dateEcheance(dateEff.plusDays(15))
                            .commentaire("Acompte 50% encaisse")
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

                reglements.add(reglementRepository.save(reglement));

                // Generate matching invoice
                try {
                    invoiceService.generateInvoiceForOperation(savedProd.getId());
                } catch (Exception ignored) {}

                policyCounter++;
            }
        }

        log.info("✓ DataSeeder completed! Created {} clients, {} compagnes, {} productions, {} reglements for 2026.",
                clients.size(), compagnes.size(), productions.size(), reglements.size());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("exercice", 2026);
        result.put("compagnesCreated", compagnes.size());
        result.put("clientsCreated", clients.size());
        result.put("productionsCreated", productions.size());
        result.put("reglementsCreated", reglements.size());
        return result;
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
                Category.builder().name("AT").commissionRate(15.0).build(),
                Category.builder().name("RC").commissionRate(25.0).build(),
                Category.builder().name("MULT").commissionRate(22.0).build(),
                Category.builder().name("SANT INTER").commissionRate(12.0).build(),
                Category.builder().name("MARITIME").commissionRate(27.5).build()
        );
        return categoryRepository.saveAll(categories);
    }

    private List<Compagne> seedCompagnes() {
        if (compagneRepository.count() > 0) return compagneRepository.findAll();
        List<String> names = List.of(
                "Sanlam Maroc",
                "Wafa Assurance",
                "RMA (Royale Marocaine d'Assurances)",
                "AtlantaSanad Assurance",
                "Allianz Maroc",
                "Mutuelle de Taounate"
        );
        List<Compagne> list = names.stream()
                .map(n -> Compagne.builder().compagneName(n).build())
                .toList();
        return compagneRepository.saveAll(list);
    }

    private List<Client> seedClients() {
        if (clientRepository.count() > 0) return clientRepository.findAll();

        LocalDateTime dateStart = LocalDateTime.of(2026, 1, 1, 8, 30);

        List<Client> clients = List.of(
                // Particuliers
                Client.builder().type(Client.ClientType.particulier).nom("EL MANSOURI").prenom("Youssef").cin("AB654321").tel("+212 661-123456").adresse("125 Boulevard Zerktouni, Casablanca").budget(15000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("CHRAIBI").prenom("Fatima-Zohra").cin("CD987654").tel("+212 663-987654").adresse("45 Avenue Hassan II, Rabat").budget(22000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("BENJELLOUN").prenom("Karim").cin("BE456789").tel("+212 662-456789").adresse("12 Rue de la Liberté, Tanger").budget(18000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("EL AMRANI").prenom("Amina").cin("G789012").tel("+212 668-789012").adresse("88 Avenue Mohammed V, Marrakech").budget(30000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("BERRADA").prenom("Tariq").cin("K345678").tel("+212 667-345678").adresse("14 Rue Allal Ben Abdellah, Fès").budget(12000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("NACIRI").prenom("Houda").cin("HA123987").tel("+212 666-123987").adresse("30 Boulevard Hassan II, Agadir").budget(25000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.particulier).nom("TAZI").prenom("Omar").cin("C456123").tel("+212 665-456123").adresse("56 Rue Mohamed Smiha, Casablanca").budget(40000).dateDebut(dateStart).build(),

                // Sociétés
                Client.builder().type(Client.ClientType.societe).nom("Société Maghreb Contracting SA").ice("001847593000045").identifiantFiscal("40283921").rc("128475 Casablanca").tel("+212 522-345678").adresse("Zone Industrielle Ain Sebaâ, Casablanca").budget(150000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Travaux Généraux Atlas SARL").ice("002498132000067").identifiantFiscal("49182304").rc("154982 Casablanca").tel("+212 522-654987").adresse("34 Boulevard d'Anfa, Casablanca").budget(175000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Atlas Logistique & Transport SARL").ice("002154879000032").identifiantFiscal("51294830").rc("98452 Tanger").tel("+212 539-876543").adresse("Zone Franche Tanger Med, Tanger").budget(220000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Pharmacie du Parc SARL").ice("001982734000012").identifiantFiscal("38472910").rc("65432 Rabat").tel("+212 537-654321").adresse("Avenue de France, Agdal, Rabat").budget(65000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("High Tech Trading SA").ice("002394857000088").identifiantFiscal("62938471").rc("145890 Casablanca").tel("+212 522-876543").adresse("Technopark, Route de Nouaceur, Casablanca").budget(95000).dateDebut(dateStart).build(),
                Client.builder().type(Client.ClientType.societe).nom("Souss Agro Export SARL").ice("001736254000077").identifiantFiscal("29384756").rc("43210 Agadir").tel("+212 528-234567").adresse("Zone Industrielle Ait Melloul, Agadir").budget(180000).dateDebut(dateStart).build()
        );

        return clientRepository.saveAll(clients);
    }
}
