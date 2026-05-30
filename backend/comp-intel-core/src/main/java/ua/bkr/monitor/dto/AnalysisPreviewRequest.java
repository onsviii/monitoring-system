package ua.bkr.monitor.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ua.bkr.monitor.model.record.Location;

public record AnalysisPreviewRequest(
        @NotBlank(message = "Niche code is required")
        String nicheCode,

        @NotNull(message = "Location coordinates are required")
        Location location,

        @Min(value = 1, message = "Radius must be at least 1 km")
        @Max(value = 50, message = "Radius cannot exceed 50 km")
        int radiusKm,

        @Min(value = 1, message = "At least 1 competitor")
        @Max(value = 10, message = "Max 10 competitors allowed")
        int maxCompetitors
) {}