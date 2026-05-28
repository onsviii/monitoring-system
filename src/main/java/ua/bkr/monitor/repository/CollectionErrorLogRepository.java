package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.CollectionErrorLog;

import java.util.List;
import java.util.UUID;

public interface CollectionErrorLogRepository extends JpaRepository<CollectionErrorLog, UUID> {

    List<CollectionErrorLog> findBySessionIdOrderByTimestampDesc(UUID sessionId);

    List<CollectionErrorLog> findAllByOrderByTimestampDesc();
}
