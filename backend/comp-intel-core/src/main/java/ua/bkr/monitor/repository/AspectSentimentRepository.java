package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.AspectSentiment;
import ua.bkr.monitor.model.enums.Aspect;

import java.util.List;
import java.util.UUID;

public interface AspectSentimentRepository extends JpaRepository<AspectSentiment, UUID> {

    List<AspectSentiment> findByReviewId(UUID reviewId);
    List<AspectSentiment> findByReviewCompetitorIdIn(List<UUID> competitorIds);
    List<AspectSentiment> findByReviewCompetitorId(UUID competitorId);
    List<AspectSentiment> findByReviewCompetitorIdAndCategoryName(UUID reviewCompetitorId, Aspect categoryName);
}
