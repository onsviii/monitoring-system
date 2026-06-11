package ua.bkr.monitor.provider.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SerpApiReviewDto(
        String snippet,
        Integer rating,
        @JsonProperty("iso_date") String isoDate,
        String date
) {}