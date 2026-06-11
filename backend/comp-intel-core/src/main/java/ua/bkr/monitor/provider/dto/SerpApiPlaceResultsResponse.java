package ua.bkr.monitor.provider.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SerpApiPlaceResultsResponse(
        @JsonProperty("place_results") PlaceResults placeResults
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlaceResults(
            @JsonProperty("user_reviews") UserReviews userReviews
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UserReviews(
            @JsonProperty("most_relevant") List<SerpApiReviewDto> mostRelevant
    ) {}
}