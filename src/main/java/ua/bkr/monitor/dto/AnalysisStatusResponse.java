package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.enums.AnalysisStatus;

import java.util.UUID;

public record AnalysisStatusResponse(
        UUID id,
        AnalysisStatus status
) {}
