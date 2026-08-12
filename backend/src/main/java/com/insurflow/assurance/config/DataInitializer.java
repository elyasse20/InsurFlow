package com.insurflow.assurance.config;

import com.insurflow.assurance.model.*;
import com.insurflow.assurance.repository.*;
import com.insurflow.assurance.service.DataSeederService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * DataInitializer — runs on startup, creates the default admin user and seeds default
 * parameters, categories, natures and TVA from specifications if they are empty.
 */

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final NatureRepository natureRepository;
    private final CategoryRepository categoryRepository;
    private final ParametreRepository parametreRepository;
    private final TvaRepository tvaRepository;
    private final ProductionRepository productionRepository;
    private final DataSeederService dataSeederService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@insurflow.com}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Override
    public void run(String... args) {
        seedAdmin();
        seedNatures();
        seedCategories();
        seedParametres();
        seedTvas();

        if (productionRepository.count() == 0) {
            log.info("Production database is empty. Auto-seeding InsurFlow mock data for 2026...");
            dataSeederService.seedMockData(false);
        }
    }

    private void seedAdmin() {
        if (userRepository.existsByEmail(adminEmail)) {
            log.info("✓ Admin user already exists: {}", adminEmail);
            return;
        }

        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .password(passwordEncoder.encode(adminPassword))
                .role(User.UserRole.ADMIN)
                .build();

        userRepository.save(admin);
        log.info("✓ Admin user created: {} (role: ADMIN)", adminEmail);
        log.warn("⚠ Change the default admin password in production!");
    }

    private void seedNatures() {
        if (natureRepository.count() == 0) {
            List<Nature> natures = List.of(
                    Nature.builder().name("RENOUVELLEMENT").build(),
                    Nature.builder().name("AFFAIRE NOUVELLE").build()
            );
            natureRepository.saveAll(natures);
            log.info("✓ Seeded {} default Natures", natures.size());
        }
    }

    private void seedCategories() {
        if (categoryRepository.count() == 0) {
            List<Category> categories = List.of(
                    Category.builder().name("AT").commissionRate(15.0).build(),
                    Category.builder().name("RC").commissionRate(25.0).build(),
                    Category.builder().name("MULT").commissionRate(25.0).build(),
                    Category.builder().name("SANT INTER").commissionRate(10.0).build(),
                    Category.builder().name("MARITIME").commissionRate(27.5).build()
            );
            categoryRepository.saveAll(categories);
            log.info("✓ Seeded {} default Categories with commission rates", categories.size());
        }
    }

    private void seedParametres() {
        if (parametreRepository.count() == 0) {
            List<Parametre> parametres = List.of(
                    Parametre.builder().name("PRIMES").type("NUMBER").value("0").build(),
                    Parametre.builder().name("TAXE").type("NUMBER").value("0").build(),
                    Parametre.builder().name("TAXE PARAFISCALE").type("NUMBER").value("0").build(),
                    Parametre.builder().name("ACCESSOIRE").type("NUMBER").value("0").build(),
                    Parametre.builder().name("CNPAC").type("NUMBER").value("0").build(),
                    Parametre.builder().name("COUT").type("NUMBER").value("0").build(),
                    Parametre.builder().name("COMMISSION").type("NUMBER").value("0").build()
            );
            parametreRepository.saveAll(parametres);
            log.info("✓ Seeded {} standard pricing Parametres", parametres.size());
        }
    }

    private void seedTvas() {
        if (tvaRepository.count() == 0) {
            List<Tva> tvas = List.of(
                    Tva.builder().name("TVA 14%").rate(14.0).build(),
                    Tva.builder().name("TVA 20%").rate(20.0).build(),
                    Tva.builder().name("TVA 10%").rate(10.0).build(),
                    Tva.builder().name("TVA 7%").rate(7.0).build()
            );
            tvaRepository.saveAll(tvas);
            log.info("✓ Seeded {} default TVAs", tvas.size());
        }
    }
}
