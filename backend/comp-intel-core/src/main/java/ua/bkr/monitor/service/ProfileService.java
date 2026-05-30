package ua.bkr.monitor.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.CreateProfileRequest;
import ua.bkr.monitor.dto.ProfileResponse;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.mapper.UserProfileMapper;
import ua.bkr.monitor.model.UserProfile;
import ua.bkr.monitor.model.enums.Role;
import ua.bkr.monitor.repository.UserProfileRepository;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {
    private final UserProfileRepository userProfileRepository;
    private final FirebaseAuth firebaseAuth;
    private final UserProfileMapper userProfileMapper;

    @Transactional
    public ProfileResponse create(String userId, CreateProfileRequest request) {
        UserProfile profile = userProfileMapper.toEntity(request, userId);
        userProfileRepository.save(profile);
        setFirebaseRoleClaim(userId, Role.BUSINESS);

        return userProfileMapper.toResponse(profile);
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(String userId) {
        UserProfile profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + userId));

        return userProfileMapper.toResponse(profile);
    }

    private void setFirebaseRoleClaim(String userId, Role role) {
        try {
            firebaseAuth.setCustomUserClaims(userId, Map.of("role", role));
            log.info("Firebase custom claim 'role={}' set for user {}", role, userId);
        } catch (FirebaseAuthException e) {
            log.error("Failed to set Firebase custom claims for user {}: {}", userId, e.getMessage());
        }
    }
}
