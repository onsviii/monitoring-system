package ua.bkr.monitor.mapper;

import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.model.*;

import java.util.*;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface ReportMapper {
    @Mapping(target = "sessionId", source = "session.id")
    @Mapping(target = "generatedAt", source = "report.generatedAt")
    @Mapping(target = "aiMarked", source = "report.aiMarked")
    @Mapping(target = "disclaimer", source = "report.disclaimer")
    @Mapping(target = "aggregatedStatistics", source = "report.aggregatedStatistics")
    @Mapping(target = "competitors", source = "competitors")
    @Mapping(target = "recommendations", source = "recommendations")
    ReportResponse toReportResponse(
            AnalyticalReport report,
            AnalysisSession session,
            List<CompetitorDto> competitors,
            List<RecommendationDto> recommendations
    );

    @Mapping(target = "nicheCode", source = "competitor.niche.displayName")
    @Mapping(target = "isOwn", expression = "java( competitor.getExternalApiId() != null && competitor.getExternalApiId().equals(ownPlaceId) )")
    @Mapping(target = "reviewCount", expression = "java( getReviewCount(competitor.getId(), reviewsMap) )")
    @Mapping(target = "aspects", expression = "java( mapAspects(competitor.getId(), aspectsMap) )")
    @Mapping(target = "freeCharacteristics", expression = "java( mapCharacteristics(competitor.getId(), characteristicsMap, charSourcesMap) )")
    CompetitorDto toCompetitorDto(
            Competitor competitor,
            String ownPlaceId,
            @Context Map<UUID, List<Review>> reviewsMap,
            @Context Map<UUID, List<AspectSentiment>> aspectsMap,
            @Context Map<UUID, List<FreeCharacteristic>> characteristicsMap,
            @Context Map<UUID, List<CharacteristicSource>> charSourcesMap
    );

    @Mapping(target = "sourceIds", expression = "java( mapRecommendationSources(recommendation.getId(), recSourcesMap) )")
    RecommendationDto toRecommendationDto(
            Recommendation recommendation,
            @Context Map<UUID, List<RecommendationSource>> recSourcesMap
    );

    default int getReviewCount(UUID competitorId, Map<UUID, List<Review>> reviewsMap) {
        return reviewsMap.getOrDefault(competitorId, Collections.emptyList()).size();
    }

    default List<AspectDto> mapAspects(UUID competitorId, Map<UUID, List<AspectSentiment>> aspectsMap) {
        List<AspectSentiment> sentiments = aspectsMap.getOrDefault(competitorId, Collections.emptyList());
        return sentiments.stream()
                .filter(s -> s.getPolarity() != null && s.getPolarity() != 0)
                .collect(Collectors.groupingBy(s -> s.getCategory().getName()))
                .entrySet().stream()
                .map(entry -> new AspectDto(
                        entry.getKey(),
                        entry.getValue().stream().mapToInt(AspectSentiment::getPolarity).average().orElse(0),
                        entry.getValue().stream()
                                .map(AspectSentiment::getConfidenceScore)
                                .filter(Objects::nonNull)
                                .mapToDouble(Float::doubleValue)
                                .average().orElse(0),
                        entry.getValue().size()
                ))
                .toList();
    }

    default List<FreeCharacteristicDto> mapCharacteristics(
            UUID competitorId,
            Map<UUID, List<FreeCharacteristic>> characteristicsMap,
            Map<UUID, List<CharacteristicSource>> charSourcesMap) {

        List<FreeCharacteristic> chars = characteristicsMap.getOrDefault(competitorId, Collections.emptyList());
        return chars.stream()
                .map(fc -> new FreeCharacteristicDto(
                        fc.getId(),
                        fc.getText(),
                        charSourcesMap.getOrDefault(fc.getId(), Collections.emptyList()).stream()
                                .map(cs -> cs.getReview().getId())
                                .toList()
                ))
                .toList();
    }

    default List<UUID> mapRecommendationSources(UUID recId, Map<UUID, List<RecommendationSource>> recSourcesMap) {
        return recSourcesMap.getOrDefault(recId, Collections.emptyList()).stream()
                .map(rs -> rs.getReview().getId())
                .toList();
    }
}