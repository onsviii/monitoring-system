package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.Competitor;

import java.util.List;
import java.util.UUID;

public interface CompetitorRepository extends JpaRepository<Competitor, UUID> {

    List<Competitor> findBySessionId(UUID sessionId);
}
