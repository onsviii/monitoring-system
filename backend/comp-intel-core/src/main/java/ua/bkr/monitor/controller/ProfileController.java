package ua.bkr.monitor.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ua.bkr.monitor.dto.CreateProfileRequest;
import ua.bkr.monitor.dto.ProfileResponse;
import ua.bkr.monitor.service.ProfileService;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PostMapping
    public ResponseEntity<ProfileResponse> create(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody CreateProfileRequest request
    ) {
        ProfileResponse response = profileService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<ProfileResponse> get(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(profileService.get(userId));
    }
}
