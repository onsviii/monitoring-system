package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.Review;

import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    @EntityGraph(attributePaths = {"competitor"})
    List<Review> findAllWithCompetitorByIdIn(List<UUID> ids);
    List<Review> findByCompetitorIdIn(List<UUID> competitorIds);
    List<Review> findByCompetitorSessionId(UUID sessionId);
    void deleteByCompetitorSessionId(UUID sessionId);
}
