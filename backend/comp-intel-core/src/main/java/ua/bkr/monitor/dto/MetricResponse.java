package ua.bkr.monitor.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MetricResponse(
        UUID id,
        String metricName,
        Float value,
        String modelVersion,
        LocalDateTime capturedAt
) {}
