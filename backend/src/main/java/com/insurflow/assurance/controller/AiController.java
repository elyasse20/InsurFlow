package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.CopilotChatRequest;
import com.insurflow.assurance.dto.CopilotChatResponse;
import com.insurflow.assurance.dto.RiskAssessmentRequest;
import com.insurflow.assurance.dto.RiskAssessmentResponse;
import com.insurflow.assurance.service.AiCopilotService;
import com.insurflow.assurance.service.AiRiskAssessmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiController {

    private final AiRiskAssessmentService aiRiskAssessmentService;
    private final AiCopilotService aiCopilotService;

    @PostMapping("/risk-assessment")
    public ResponseEntity<RiskAssessmentResponse> assessRisk(@RequestBody RiskAssessmentRequest request) {
        log.info("Received request for AI risk assessment: {}", request);
        RiskAssessmentResponse response = aiRiskAssessmentService.assessRisk(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/copilot")
    public ResponseEntity<CopilotChatResponse> chat(@RequestBody CopilotChatRequest request) {
        log.info("Received request for AI Copilot chat on page: {}", request.getContextPage());
        CopilotChatResponse response = aiCopilotService.chat(request);
        return ResponseEntity.ok(response);
    }
}
