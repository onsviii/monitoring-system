package ua.bkr.monitor;

import ua.bkr.monitor.dto.CreateAnalysisRequest;

import java.util.UUID;

public record AnalysisCreatedEvent(
        UUID sessionId,
        CreateAnalysisRequest request
) {}