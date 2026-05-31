package ua.bkr.monitor.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ReportResponse(
        UUID sessionId,
        String reportName,
        LocalDateTime generatedAt,
        Boolean aiMarked,
        String disclaimer,
        AggregatedStatistics aggregatedStatistics,
        List<CompetitorDto> competitors,
        List<RecommendationDto> recommendations
) {}
