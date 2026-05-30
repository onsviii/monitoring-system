package ua.bkr.monitor.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ua.bkr.monitor.dto.CreateAnalysisRequest;
import ua.bkr.monitor.dto.AnalysisStatusResponse;
import ua.bkr.monitor.model.AnalysisSession;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.UserProfile;
import ua.bkr.monitor.model.enums.AnalysisStage;

@Mapper(componentModel = "spring", imports = {AnalysisStage.class})
public interface AnalysisSessionMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", source = "user")
    @Mapping(target = "businessNiche", source = "niche")
    @Mapping(target = "location", source = "request.location")
    @Mapping(target = "radiusKm", source = "request.radiusKm")
    @Mapping(target = "status", expression = "java(AnalysisStatus.COLLECTING_DATA)")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "llmLogs", ignore = true)
    @Mapping(target = "errorLogs", ignore = true)
    @Mapping(target = "competitors", ignore = true)
    @Mapping(target = "analyticalReports", ignore = true)
    @Mapping(target = "chatMessages", ignore = true)
    AnalysisSession toEntity(CreateAnalysisRequest request, UserProfile user, Niche niche);

    // 2. Мапимо AnalysisSession -> AnalysisStatusResponse
    // Поля id та status збігаються за назвами й типами, мапиться автоматично
    AnalysisStatusResponse toStatusResponse(AnalysisSession session);
}