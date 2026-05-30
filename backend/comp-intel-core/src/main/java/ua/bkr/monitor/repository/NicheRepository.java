package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.Niche;

import java.util.Optional;
import java.util.UUID;

public interface NicheRepository extends JpaRepository<Niche, UUID> {

    @EntityGraph(attributePaths = "googleTypes")
    Optional<Niche> findByCode(String code);
}