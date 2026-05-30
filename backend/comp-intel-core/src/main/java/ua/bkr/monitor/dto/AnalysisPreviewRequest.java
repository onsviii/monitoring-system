package ua.bkr.monitor.dto;

import jakarta.validation.constraints.*;
import ua.bkr.monitor.model.record.Location;

public record AnalysisPreviewRequest(
        @NotBlank(message = "Niche code is required")
        String nicheCode,

        @NotNull(message = "Location coordinates are required")
        Location location,

        @DecimalMin(value = "0.5", message = "Radius must be at least 0.5 km")
        @DecimalMax(value = "10.0", message = "Radius cannot exceed 10 km")
        double radiusKm,

        @Min(value = 1, message = "At least 1 competitor")
        @Max(value = 10, message = "Max 10 competitors allowed")
        int maxCompetitors
) {}