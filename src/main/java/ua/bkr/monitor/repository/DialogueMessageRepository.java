package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.DialogueMessage;

import java.util.List;
import java.util.UUID;

public interface DialogueMessageRepository extends JpaRepository<DialogueMessage, UUID> {

    List<DialogueMessage> findBySessionIdOrderByTimestampAsc(UUID sessionId);
}
