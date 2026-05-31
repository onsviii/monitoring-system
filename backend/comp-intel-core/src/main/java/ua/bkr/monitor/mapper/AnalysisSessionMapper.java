package ua.bkr.monitor.mapper;

import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import ua.bkr.monitor.dto.AnalysisStatusResponse;
import ua.bkr.monitor.dto.CreateAnalysisRequest;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.UserProfile;
import ua.bkr.monitor.model.enums.AnalysisStage;

@Mapper(componentModel = "spring", imports = {AnalysisSession.class})
public interface AnalysisSessionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", source = "user")
    @Mapping(target = "businessNiche", source = "niche")
    @Mapping(target = "location", source = "request.location")
    @Mapping(target = "radiusKm", source = "request.radiusKm")
    @Mapping(target = "reportName", source = "request.reportName")
    @Mapping(target = "status", expression = "java(SessionStatus.PENDING)")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "llmLogs", ignore = true)
    @Mapping(target = "errorLogs", ignore = true)
    @Mapping(target = "competitors", ignore = true)
    @Mapping(target = "analyticalReports", ignore = true)
    @Mapping(target = "chatMessages", ignore = true)
    @Mapping(target = "stage", expression = "java(AnalysisStage.COLLECTING_DATA)")
    AnalysisSession toEntity(CreateAnalysisRequest request, UserProfile user, Niche niche);

    @Mapping(target = "progress", ignore = true)
    @Mapping(target = "competitorsCount", ignore = true)
    AnalysisStatusResponse toStatusResponse(AnalysisSession session);

    @AfterMapping
    default void fillExtraFields(AnalysisSession session, @MappingTarget AnalysisStatusResponse response) {
        int progress = calculateProgress(session.getStage());
        response.setProgress(progress);
        if (session.getCompetitors() != null) {
            response.setCompetitorsCount(session.getCompetitors().size());
        } else {
            response.setCompetitorsCount(0);
        }
    }

    static int calculateProgress(AnalysisStage stage) {
        if (stage == null) return 0;
        return switch (stage) {
            case COLLECTING_DATA -> 20;
            case ANONYMIZING -> 40;
            case CLASSIFYING -> 60;
            case EXTRACTING_CHARACTERISTICS -> 80;
            case GENERATING_REPORT -> 90;
        };
    }
}