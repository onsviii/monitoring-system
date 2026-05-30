package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.FreeCharacteristic;

import java.util.List;
import java.util.UUID;

public interface FreeCharacteristicRepository extends JpaRepository<FreeCharacteristic, UUID> {
    List<FreeCharacteristic> findByCompetitorId(UUID competitorId);
    List<FreeCharacteristic> findByCompetitorIdIn(List<UUID> competitorIds);
    void deleteByCompetitorSessionId(UUID sessionId);
}
