package ua.bkr.monitor.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ua.bkr.monitor.model.ChatMessage;

import java.util.List;
import java.util.UUID;

public interface DialogueMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByTimestampAsc(UUID sessionId);
}
