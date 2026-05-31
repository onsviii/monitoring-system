package ua.bkr.monitor.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.service.AnalysisService;
import ua.bkr.monitor.service.ReportService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analyses")
@RequiredArgsConstructor
@PreAuthorize("hasRole('BUSINESS')")
public class AnalysisController {
    private final AnalysisService analysisService;
    private final ReportService reportService;

    /**
     * POST /api/v1/analyses/preview — попередній перегляд конкурентів.
     * Використовується фронтендом для відображення списку закладів у радіусі
     * перед тим, як користувач підтвердить створення сесії аналізу.
     */
    @PostMapping("/preview")
    public ResponseEntity<PlaceSearchResponse> previewAnalysis(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody AnalysisPreviewRequest request) {

        PlaceSearchResponse response = analysisService.preview(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/analyses — ініціалізація нового аналізу.
     * Повертає 202 Accepted з ідентифікатором сесії.
     */
    @PostMapping
    public ResponseEntity<AnalysisStatusResponse> createAnalysis(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody CreateAnalysisRequest request) {

        AnalysisStatusResponse response = analysisService.create(userId, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
    @GetMapping("/{id}")
    public ResponseEntity<AnalysisStatusResponse> getStatus(
            @AuthenticationPrincipal String userId, @PathVariable UUID id) {

        AnalysisStatusResponse response = analysisService.getStatus(userId, id);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/analyses/{id}/report — повний аналітичний звіт.
     */
    @GetMapping("/{id}/report")
    public ResponseEntity<ReportResponse> getReport(
            @AuthenticationPrincipal String userId, @PathVariable UUID id) {

        ReportResponse response = reportService.getReport(userId, id);
        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/v1/analyses/{id}/report — оновлення назви звіту.
     */
    @PatchMapping("/{id}/report")
    public ResponseEntity<UpdateReportNameResponse> updateReportName(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReportNameRequest request) {

        UpdateReportNameResponse response = reportService.updateReportName(userId, id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/analyses/{id}/sources?competitor={compId}&aspect={name}
     * Першоджерела конкретного аспекту конкурента.
     */
    @GetMapping("/{id}/sources")
    public ResponseEntity<SourcesResponse> getSources(
            @AuthenticationPrincipal String userId, @PathVariable UUID id,
            @RequestParam UUID competitor, @RequestParam Aspect aspect) {

        SourcesResponse response = reportService.getSources(userId, id, competitor, aspect);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{sessionId}/retry")
    public ResponseEntity<AnalysisStatusResponse> retryAnalysis(
            @AuthenticationPrincipal String userId, @PathVariable UUID sessionId) {

        return ResponseEntity.ok(analysisService.retryAnalysis(userId, sessionId));
    }
}
