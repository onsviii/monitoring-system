package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.AspectSentiment;

import java.util.List;
import java.util.UUID;

public interface AspectSentimentRepository extends JpaRepository<AspectSentiment, UUID> {

    List<AspectSentiment> findByReviewId(UUID reviewId);

    List<AspectSentiment> findByReviewCompetitorId(UUID competitorId);

    List<AspectSentiment> findByReviewCompetitorIdAndCategoryName(UUID competitorId, String categoryName);
}
