package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.RiskAssessmentRequest;
import com.insurflow.assurance.dto.RiskAssessmentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AiRiskAssessmentServiceTest {

    private AiRiskAssessmentService aiService;

    @BeforeEach
    void setUp() {
        aiService = new AiRiskAssessmentService();
    }

    @Test
    @DisplayName("Should evaluate Low Risk profile for experienced driver with zero claims")
    void testLowRiskProfile() {
        RiskAssessmentRequest request = RiskAssessmentRequest.builder()
                .clientName("Société Atlas Transport")
                .clientAge(40)
                .vehicleType("Berline")
                .annualMileage(7000.0)
                .historyClaimsCount(0)
                .usageType("Personnel / Privé")
                .category("AUTO")
                .build();

        RiskAssessmentResponse response = aiService.assessRisk(request);

        assertNotNull(response);
        assertEquals("LOW", response.getRiskLevel());
        assertTrue(response.getRiskScore() >= 75, "Score should be >= 75 for low risk");
        assertNotNull(response.getSummary());
        assertNotNull(response.getPricingRecommendation());
        assertFalse(response.getRecommendedGuarantees().isEmpty());
        assertTrue(response.getRecommendedGuarantees().contains("Bris de glace"));
        assertTrue(response.getRecommendedGuarantees().contains("Vol et Incendie"));
        assertFalse(response.getFlags().isEmpty());
    }

    @Test
    @DisplayName("Should evaluate High Risk profile for young driver with multiple claims and intensive usage")
    void testHighRiskProfile() {
        RiskAssessmentRequest request = RiskAssessmentRequest.builder()
                .clientName("Nouveau Conducteur")
                .clientAge(21)
                .vehicleType("Sport / Prestige")
                .annualMileage(45000.0)
                .historyClaimsCount(3)
                .usageType("Usage intensif")
                .category("AUTO")
                .build();

        RiskAssessmentResponse response = aiService.assessRisk(request);

        assertNotNull(response);
        assertEquals("HIGH", response.getRiskLevel());
        assertTrue(response.getRiskScore() < 50, "Score should be < 50 for high risk");
        assertTrue(response.getPricingRecommendation().contains("Majorer") || response.getPricingRecommendation().contains("franchise"));
    }

    @Test
    @DisplayName("Should provide specific guarantees for Maritime category")
    void testMaritimeCategoryGuarantees() {
        RiskAssessmentRequest request = RiskAssessmentRequest.builder()
                .clientName("Armateur Tanger")
                .clientAge(45)
                .vehicleType("Navire / Bateau")
                .annualMileage(10000.0)
                .historyClaimsCount(0)
                .usageType("Transport de Marchandises")
                .category("MARITIME")
                .build();

        RiskAssessmentResponse response = aiService.assessRisk(request);

        assertNotNull(response);
        assertTrue(response.getRecommendedGuarantees().contains("Corps de navire"));
        assertTrue(response.getRecommendedGuarantees().contains("Responsabilité civile maritime"));
    }
}
