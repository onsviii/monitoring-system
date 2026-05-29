package ua.bkr.monitor.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateProfileRequest(
        @NotBlank String businessName,
        String googlePlaceId,
        String address,
        Double latitude,
        Double longitude
) {}