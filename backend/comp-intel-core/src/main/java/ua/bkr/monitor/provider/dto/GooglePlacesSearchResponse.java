package ua.bkr.monitor.provider.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GooglePlacesSearchResponse(
        List<GooglePlaceDto> places
) {}