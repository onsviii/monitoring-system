package ua.bkr.monitor.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import ua.bkr.monitor.model.enums.AnalysisStage;
import ua.bkr.monitor.model.enums.SessionStatus;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class AnalysisStatusResponse {
    private UUID id;
    private AnalysisStage stage;
    private int progress;
    private SessionStatus status;
    private int competitorsCount;
}
