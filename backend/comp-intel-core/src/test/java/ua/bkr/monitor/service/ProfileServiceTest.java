package ua.bkr.monitor.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.CreateProfileRequest;
import ua.bkr.monitor.dto.ProfileResponse;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.mapper.UserProfileMapper;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.UserProfile;
import ua.bkr.monitor.model.enums.Role;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.repository.NicheRepository;
import ua.bkr.monitor.repository.UserProfileRepository;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    private static final String USER_ID = "user-123";

    @Mock private UserProfileRepository userProfileRepository;
    @Mock private NicheRepository nicheRepository;
    @Mock private FirebaseAuth firebaseAuth;
    @Mock private UserProfileMapper userProfileMapper;
    @InjectMocks private ProfileService service;

    @Test
    void create_throwsWhenNicheMissing() {
        CreateProfileRequest request = new CreateProfileRequest(
                "UNKNOWN", "Biz", "place-1", "Address", new Location(50.0, 30.0)
        );
        when(nicheRepository.findByCode("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(USER_ID, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_savesProfileAndSetsRoleClaim() throws FirebaseAuthException {
        CreateProfileRequest request = new CreateProfileRequest(
                "COFFEE", "Biz", "place-1", "Address", new Location(50.0, 30.0)
        );
        Niche niche = new Niche();
        niche.setCode("COFFEE");
        UserProfile profile = new UserProfile();
        ProfileResponse response = new ProfileResponse("Biz", "COFFEE", "Кав'ярня","place-1", "Address", request.location());

        when(nicheRepository.findByCode("COFFEE")).thenReturn(Optional.of(niche));
        when(userProfileMapper.toEntity(request, USER_ID, niche)).thenReturn(profile);
        when(userProfileRepository.save(profile)).thenReturn(profile);
        when(userProfileMapper.toResponse(profile)).thenReturn(response);

        ProfileResponse result = service.create(USER_ID, request);

        assertThat(result).isSameAs(response);
        verify(userProfileRepository).save(profile);
        verify(firebaseAuth).setCustomUserClaims(eq(USER_ID), eq(Map.of("role", Role.BUSINESS.name())));
    }

    @Test
    void get_throwsWhenProfileMissing() {
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(USER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void get_returnsMappedResponse() {
        UserProfile profile = new UserProfile();
        ProfileResponse response = new ProfileResponse("Biz", "COFFEE", "Кав'ярня","place-1", "Address", new Location(1.0, 2.0));
        when(userProfileRepository.findById(USER_ID)).thenReturn(Optional.of(profile));
        when(userProfileMapper.toResponse(profile)).thenReturn(response);

        ProfileResponse result = service.get(USER_ID);

        assertThat(result).isSameAs(response);
    }
}
