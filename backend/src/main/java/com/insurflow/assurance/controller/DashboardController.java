package com.insurflow.assurance.controller;

import com.insurflow.assurance.dto.DashboardStats;
import com.insurflow.assurance.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * GET /api/dashboard/stats?exercice=2026
 * Returns all KPI data filtered by accounting exercise in one call.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getStats(@RequestParam(required = false) Integer exercice) {
        int targetExercice = (exercice != null && exercice > 1900) ? exercice : LocalDate.now().getYear();
        return ResponseEntity.ok(dashboardService.getStats(targetExercice));
    }
}
