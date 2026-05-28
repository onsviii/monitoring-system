package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.AspectCategory;

import java.util.Optional;
import java.util.UUID;

public interface AspectCategoryRepository extends JpaRepository<AspectCategory, UUID> {

    Optional<AspectCategory> findByName(String name);
}
