package ua.bkr.monitor.event;

import ua.bkr.monitor.dto.CreateAnalysisRequest;

import java.util.UUID;

public record AnalysisCreatedEvent(
        UUID sessionId,
        CreateAnalysisRequest request
) {}