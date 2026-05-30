package ua.bkr.monitor.model.record;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Location(
        Double latitude,
        Double longitude
) {}