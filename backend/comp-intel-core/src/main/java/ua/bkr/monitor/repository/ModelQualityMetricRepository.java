package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.ModelQualityMetric;

import java.util.List;
import java.util.UUID;

public interface ModelQualityMetricRepository extends JpaRepository<ModelQualityMetric, UUID> {

    List<ModelQualityMetric> findByModelVersionOrderByCapturedAtDesc(String modelVersion);

    List<ModelQualityMetric> findAllByOrderByCapturedAtDesc();
}
