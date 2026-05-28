package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.AnalyticalReport;

import java.util.Optional;
import java.util.UUID;

public interface AnalyticalReportRepository extends JpaRepository<AnalyticalReport, Long> {

    Optional<AnalyticalReport> findBySessionId(UUID sessionId);
}
