package ua.bkr.monitor.provider.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleReviewDto(
        LocalizedText text,
        LocalizedText originalText,
        Integer rating,
        String publishTime
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LocalizedText(String text) {}
}