package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.AnalysisSession;

import java.util.List;
import java.util.UUID;

public interface AnalysisSessionRepository extends JpaRepository<AnalysisSession, UUID> {

    List<AnalysisSession> findByUserIdOrderByCreatedAtDesc(String userId);
}
