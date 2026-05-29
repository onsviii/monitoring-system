package ua.bkr.monitor.dto;

import java.util.List;
import java.util.UUID;

public record RecommendationDto(
        UUID id,
        String text,
        List<UUID> sourceReviewIds
) {
}
