package ua.bkr.monitor.provider.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import ua.bkr.monitor.dto.PlaceSearchResponse;
import ua.bkr.monitor.provider.GooglePlacesClient.PlaceInfo;
import ua.bkr.monitor.provider.GooglePlacesClient.RawReview;
import ua.bkr.monitor.provider.dto.GooglePlaceDto;
import ua.bkr.monitor.provider.dto.GoogleReviewDto;
import ua.bkr.monitor.dto.PlaceSearchResponse.PlaceCandidate;

import java.util.List;

@Mapper(componentModel = "spring")
public interface GooglePlacesMapper {
    @Mapping(source = "id", target = "placeId")
    @Mapping(source = "displayName.text", target = "name", defaultValue = "Unknown")
    @Mapping(source = "formattedAddress", target = "address")
    @Mapping(source = "primaryType", target = "category")
    @Mapping(source = "location", target = "location")
    PlaceInfo toPlaceInfo(GooglePlaceDto place);

    List<PlaceInfo> toPlaceInfoList(List<GooglePlaceDto> places);


    @Mapping(source = ".", target = "text", qualifiedByName = "extractReviewText")
    RawReview toRawReview(GoogleReviewDto review);

    default PlaceSearchResponse toPlaceSearchResponse(List<PlaceInfo> placeInfos) {
        if (placeInfos == null) {
            return new PlaceSearchResponse(List.of());
        }

        List<PlaceCandidate> candidates = toPlaceCandidateList(placeInfos);
        return new PlaceSearchResponse(candidates);
    }

    List<PlaceCandidate> toPlaceCandidateList(List<PlaceInfo> placeInfos);

    @Mapping(source = "placeId", target = "googlePlaceId")
    PlaceCandidate toPlaceCandidate(PlaceInfo placeInfo);

    default List<RawReview> toRawReviewsFiltered(List<GoogleReviewDto> reviews) {
        if (reviews == null) {
            return List.of();
        }
        return reviews.stream()
                .map(this::toRawReview)
                .filter(r -> r.text() != null && !r.text().isBlank())
                .toList();
    }

    @Named("extractReviewText")
    default String extractReviewText(GoogleReviewDto review) {
        if (review.originalText() != null && review.originalText().text() != null) {
            return review.originalText().text();
        }
        if (review.text() != null && review.text().text() != null) {
            return review.text().text();
        }
        return "";
    }
}