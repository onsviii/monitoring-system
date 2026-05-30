package ua.bkr.monitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ua.bkr.monitor.model.record.Location;

public record CreateProfileRequest(
        @NotBlank String nicheCode,
        @NotBlank String businessName,
        String googlePlaceId,
        String address,
        @NotNull Location location
) {}