package com.insurflow.assurance.service;

import com.insurflow.assurance.dto.ChatMessage;
import com.insurflow.assurance.dto.CopilotChatRequest;
import com.insurflow.assurance.dto.CopilotChatResponse;
import com.insurflow.assurance.repository.ClientRepository;
import com.insurflow.assurance.repository.ProductionRepository;
import com.insurflow.assurance.repository.ReglementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class AiCopilotServiceTest {

    private ProductionRepository productionRepository;
    private ClientRepository clientRepository;
    private ReglementRepository reglementRepository;
    private AiCopilotService copilotService;

    @BeforeEach
    void setUp() {
        productionRepository = Mockito.mock(ProductionRepository.class);
        clientRepository = Mockito.mock(ClientRepository.class);
        reglementRepository = Mockito.mock(ReglementRepository.class);

        when(productionRepository.count()).thenReturn(25L);
        when(clientRepository.count()).thenReturn(18L);
        when(reglementRepository.count()).thenReturn(40L);
        when(productionRepository.findAll()).thenReturn(Collections.emptyList());

        copilotService = new AiCopilotService(productionRepository, clientRepository, reglementRepository);
    }

    @Test
    @DisplayName("Should generate professional payment reminder email with Article 21 Loi 17-99")
    void testPaymentReminderEmailGeneration() {
        CopilotChatRequest request = CopilotChatRequest.builder()
                .messages(List.of(
                        ChatMessage.builder()
                                .role("user")
                                .content("Rédiger un email de relance de quittance impayée")
                                .build()
                ))
                .contextPage("/operations")
                .build();

        CopilotChatResponse response = copilotService.chat(request);

        assertNotNull(response);
        assertNotNull(response.getResponse());
        assertTrue(response.getResponse().contains("Modèle d'email de relance"));
        assertTrue(response.getResponse().contains("Loi n° 17-99"));
        assertTrue(response.getResponse().contains("Quittance"));
        assertFalse(response.getSuggestedActions().isEmpty());
    }

    @Test
    @DisplayName("Should provide Tous Risques vs Tiers Collision franchise technical comparison")
    void testFranchiseExplanation() {
        CopilotChatRequest request = CopilotChatRequest.builder()
                .messages(List.of(
                        ChatMessage.builder()
                                .role("user")
                                .content("Explication franchise Tous Risques vs Tiers Collision")
                                .build()
                ))
                .build();

        CopilotChatResponse response = copilotService.chat(request);

        assertNotNull(response);
        assertTrue(response.getResponse().contains("Tous Risques"));
        assertTrue(response.getResponse().contains("Dommages Collision"));
        assertTrue(response.getResponse().contains("Franchise"));
    }

    @Test
    @DisplayName("Should provide portfolio synthesis with real database metrics")
    void testPortfolioSynthesis() {
        CopilotChatRequest request = CopilotChatRequest.builder()
                .messages(List.of(
                        ChatMessage.builder()
                                .role("user")
                                .content("Synthèse de l'activité du portefeuille")
                                .build()
                ))
                .build();

        CopilotChatResponse response = copilotService.chat(request);

        assertNotNull(response);
        assertTrue(response.getResponse().contains("18")); // client count
        assertTrue(response.getResponse().contains("25")); // production count
    }

    @Test
    @DisplayName("Should understand multi-turn follow-up and customize email with client name and amount")
    void testMultiTurnContextualFollowUp() {
        CopilotChatRequest request = CopilotChatRequest.builder()
                .messages(List.of(
                        ChatMessage.builder()
                                .role("user")
                                .content("Rédiger un email de relance de quittance impayée")
                                .build(),
                        ChatMessage.builder()
                                .role("assistant")
                                .content("Voici le modèle standard de relance...")
                                .build(),
                        ChatMessage.builder()
                                .role("user")
                                .content("Peux-tu adapter cet email pour le client Société Atlas avec un montant de 14 200 DH ?")
                                .build()
                ))
                .build();

        CopilotChatResponse response = copilotService.chat(request);

        assertNotNull(response);
        assertNotNull(response.getResponse());
        assertTrue(response.getResponse().contains("Société Atlas"));
        assertTrue(response.getResponse().contains("14 200") || response.getResponse().contains("14200"));
        assertTrue(response.getResponse().contains("Loi n° 17-99"));
    }
}
