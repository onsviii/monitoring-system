package ua.bkr.monitor.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SourcesResponse(
        List<ReviewSourceDto> reviews
) {

    public record ReviewSourceDto(
            UUID id,
            String text,
            Integer rating,
            LocalDateTime createdAt,
            Integer polarity,
            Float confidenceScore
    ) {}
}
