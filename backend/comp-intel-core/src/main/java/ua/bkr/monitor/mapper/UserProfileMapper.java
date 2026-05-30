package ua.bkr.monitor.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ua.bkr.monitor.dto.CreateProfileRequest;
import ua.bkr.monitor.dto.ProfileResponse;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.UserProfile;
import ua.bkr.monitor.model.enums.Role;

import java.time.LocalDateTime;

@Mapper(componentModel = "spring", imports = {LocalDateTime.class, Role.class})
public interface UserProfileMapper {
    @Mapping(target = "id", source = "userId")
    @Mapping(target = "role", expression = "java(Role.USER)")
    @Mapping(target = "niche", source = "niche")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "sessions", ignore = true)
    UserProfile toEntity(CreateProfileRequest request, String userId, Niche niche);

    @Mapping(target = "nicheCode", source = "userProfile.niche.code")
    ProfileResponse toResponse(UserProfile userProfile);
}