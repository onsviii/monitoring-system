package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.record.Location;

public record ProfileResponse(
        String businessName,
        String googlePlaceId,
        String address,
        Location location
) {}