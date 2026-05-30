package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.RecommendationSource;
import ua.bkr.monitor.model.RecommendationSourceId;

import java.util.List;
import java.util.UUID;

public interface RecommendationSourceRepository extends JpaRepository<RecommendationSource, RecommendationSourceId> {
    List<RecommendationSource> findByRecommendationId(UUID recommendationId);
    List<RecommendationSource> findByRecommendationIdIn(List<UUID> recommendationIds);
}
