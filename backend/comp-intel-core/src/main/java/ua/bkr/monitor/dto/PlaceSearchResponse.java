package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.record.Location;

import java.util.List;

public record PlaceSearchResponse(
        List<PlaceCandidate> candidates
) {

    public record PlaceCandidate(
            String googlePlaceId,
            String name,
            String address,
            Double rating,
            Location location
    ) {}
}
