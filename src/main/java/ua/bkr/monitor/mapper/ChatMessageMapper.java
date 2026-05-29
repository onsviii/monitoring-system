package ua.bkr.monitor.mapper;

import org.mapstruct.Mapper;
import ua.bkr.monitor.dto.MessageResponse;
import ua.bkr.monitor.model.ChatMessage;
import ua.bkr.monitor.model.record.ChatTurn;

@Mapper(componentModel = "spring")
public interface ChatMessageMapper {
    ChatTurn toChatTurn(ChatMessage chatMessage);
    MessageResponse toMessageResponse(ChatMessage chatMessage);
}
