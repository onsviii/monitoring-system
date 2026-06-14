package ua.bkr.monitor.provider.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ua.bkr.monitor.dto.CreateAnalysisRequest.SelectedPlace;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.Competitor;
import ua.bkr.monitor.provider.GooglePlacesClient.PlaceInfo;

@Mapper(componentModel = "spring")
public interface CompetitorMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "freeCharacteristics", ignore = true)
    @Mapping(target = "ownBusiness", constant = "false")
    @Mapping(target = "session", source = "session")
    @Mapping(target = "niche", source = "session.businessNiche")
    @Mapping(target = "externalApiId", source = "place.placeId")
    @Mapping(target = "name", source = "place.name")
    @Mapping(target = "address", source = "place.address")
    @Mapping(target = "rating", source = "place.rating")
    @Mapping(target = "location", source = "place.location")
    Competitor fromSelectedPlace(SelectedPlace place, AnalysisSession session);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "freeCharacteristics", ignore = true)
    @Mapping(target = "ownBusiness", constant = "true")
    @Mapping(target = "session", source = "session")
    @Mapping(target = "niche", source = "session.businessNiche")
    @Mapping(target = "externalApiId", source = "info.placeId")
    @Mapping(target = "name", source = "info.name")
    @Mapping(target = "address", source = "info.address")
    @Mapping(target = "rating", source = "info.rating")
    @Mapping(target = "location", source = "info.location")
    Competitor fromPlaceInfo(PlaceInfo info, AnalysisSession session);
}
