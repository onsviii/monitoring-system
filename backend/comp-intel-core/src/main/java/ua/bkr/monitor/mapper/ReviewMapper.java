package ua.bkr.monitor.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ua.bkr.monitor.dto.SourcesResponse.ReviewSourceDto;
import ua.bkr.monitor.model.AspectSentiment;
import ua.bkr.monitor.model.Review;

@Mapper(componentModel = "spring")
public interface ReviewMapper {
    @Mapping(source = "competitor.name", target = "competitorName")
    @Mapping(target = "polarity", ignore = true)
    @Mapping(target = "confidenceScore", ignore = true)
    ReviewSourceDto toDto(Review review);

    @Mapping(source = "review.competitor.name", target = "competitorName")
    @Mapping(source = "review.id", target = "id")
    @Mapping(source = "review.text", target = "text")
    @Mapping(source = "review.rating", target = "rating")
    @Mapping(source = "review.createdAt", target = "createdAt")
    @Mapping(source = "sentiment.polarity", target = "polarity")
    @Mapping(source = "sentiment.confidenceScore", target = "confidenceScore")
    ReviewSourceDto toDtoWithSentiment(Review review, AspectSentiment sentiment);
}