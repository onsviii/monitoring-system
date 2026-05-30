package ua.bkr.monitor.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import ua.bkr.monitor.model.record.Location;

public record CreateAnalysisRequest(
        @NotBlank String nicheCode,
        @NotBlank String reportName,
        @NotNull Location location,
        @Positive Double radiusKm,
        @Max(10) Integer maxCompetitors
) {}
