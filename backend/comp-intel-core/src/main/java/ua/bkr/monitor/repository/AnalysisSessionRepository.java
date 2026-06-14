package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.enums.AnalysisStage;
import ua.bkr.monitor.model.enums.SessionStatus;

import java.util.Optional;
import java.util.UUID;

public interface AnalysisSessionRepository extends JpaRepository<AnalysisSession, UUID> {
    @EntityGraph(attributePaths = {"user"})
    Optional<AnalysisSession> findWithUserById(UUID id);

    @Modifying
    @Query("UPDATE AnalysisSession s SET s.stage = :stage WHERE s.id = :id")
    void updateStage(@Param("id") UUID id, @Param("stage") AnalysisStage stage);

    @Modifying
    @Query("UPDATE AnalysisSession s SET s.status = :status WHERE s.id = :id")
    void updateStatus(@Param("id") UUID id, @Param("status") SessionStatus status);

    @Modifying
    @Query("UPDATE AnalysisSession s SET s.status = :status, s.stage = null WHERE s.id = :id")
    void markCompleted(@Param("id") UUID id, @Param("status") SessionStatus status);
}
