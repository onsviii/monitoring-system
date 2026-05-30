package ua.bkr.monitor.provider.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import ua.bkr.monitor.model.record.Location;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GooglePlaceDto(
        String id,
        LocalizedText displayName,
        String formattedAddress,
        String primaryType,
        Double rating,
        Location location
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LocalizedText(String text) {}
}