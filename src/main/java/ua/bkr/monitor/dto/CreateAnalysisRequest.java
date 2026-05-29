package ua.bkr.monitor.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateAnalysisRequest(
        @NotBlank String niche,
        @NotBlank String location,
        @Positive Double radiusKm,
        @Max(10) Integer maxCompetitors
) {}
