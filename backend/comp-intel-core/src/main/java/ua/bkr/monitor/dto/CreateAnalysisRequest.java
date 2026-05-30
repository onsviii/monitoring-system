package ua.bkr.monitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import ua.bkr.monitor.model.record.Location;

import java.util.List;

public record CreateAnalysisRequest(
        @NotBlank String nicheCode,
        @NotBlank String reportName,
        @NotNull Location location,
        @Positive Double radiusKm,
        @NotEmpty List<SelectedPlace> selectedPlaces
) {
    public record SelectedPlace(
            @NotBlank String placeId,
            @NotBlank String name,
            String address,
            Double rating
    ) {}
}
