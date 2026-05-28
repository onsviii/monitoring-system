package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.CharacteristicSource;
import ua.bkr.monitor.model.CharacteristicSourceId;

import java.util.List;
import java.util.UUID;

public interface CharacteristicSourceRepository extends JpaRepository<CharacteristicSource, CharacteristicSourceId> {

    List<CharacteristicSource> findByCharacteristicId(UUID characteristicId);
}
