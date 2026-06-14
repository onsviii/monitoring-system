package ua.bkr.monitor.dto;

import ua.bkr.monitor.model.record.Location;

import java.util.List;
import java.util.UUID;

public record CompetitorDto(
        UUID id,
        String name,
        String address,
        String nicheCode,
        Double rating,
        int reviewCount,
        boolean isOwn,
        Location location,
        Double distance,
        List<AspectDto> aspects,
        List<FreeCharacteristicDto> freeCharacteristics
) {}
