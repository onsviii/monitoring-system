package ua.bkr.monitor.dto;

import java.util.List;
import java.util.UUID;

public record CompetitorDto(
        UUID id,
        String name,
        String address,
        String niche,
        Double rating,
        int reviewCount,
        boolean isOwn,
        List<AspectDto> aspects,
        List<FreeCharacteristicDto> freeCharacteristics
) {}
