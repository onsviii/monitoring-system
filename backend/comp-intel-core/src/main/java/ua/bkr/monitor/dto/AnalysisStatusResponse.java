package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.enums.AnalysisStage;

import java.util.UUID;

public record AnalysisStatusResponse(
        UUID id,
        AnalysisStage stage
) {}
