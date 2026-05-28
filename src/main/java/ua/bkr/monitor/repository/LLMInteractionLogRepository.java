package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.LLMInteractionLog;

import java.util.List;
import java.util.UUID;

public interface LLMInteractionLogRepository extends JpaRepository<LLMInteractionLog, UUID> {

    List<LLMInteractionLog> findBySessionIdOrderByTimestampDesc(UUID sessionId);

    List<LLMInteractionLog> findAllByOrderByTimestampDesc();
}
