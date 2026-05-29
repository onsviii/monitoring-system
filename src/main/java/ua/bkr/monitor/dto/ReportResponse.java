package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.enums.ChatRole;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ReportResponse(
        UUID sessionId,
        LocalDateTime generatedAt,
        Boolean aiMarked,
        AggregatedStatistics aggregatedStatistics,
        List<CompetitorDto> competitors,
        List<RecommendationDto> recommendations
) {}
