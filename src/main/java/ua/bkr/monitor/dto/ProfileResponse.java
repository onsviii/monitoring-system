package ua.bkr.monitor.dto;

public record ProfileResponse(
        String businessName,
        String googlePlaceId,
        String address,
        Double latitude,
        Double longitude
) {}