package ua.bkr.monitor.controller;

import com.google.firebase.auth.FirebaseAuth;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import ua.bkr.monitor.config.SecurityConfig;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import ua.bkr.monitor.dto.*;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.model.enums.*;
import ua.bkr.monitor.security.CustomAuthEntryPoint;
import ua.bkr.monitor.service.AnalysisService;
import ua.bkr.monitor.service.ReportService;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalysisController.class)
@Import(SecurityConfig.class)
class AnalysisControllerTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean AnalysisService analysisService;
    @MockitoBean ReportService reportService;
    @MockitoBean FirebaseAuth firebaseAuth;
    @MockitoBean CustomAuthEntryPoint customAuthEntryPoint;

    @BeforeEach
    void configureAuthEntryPoint() throws Exception {
        doAnswer(inv -> {
            HttpServletResponse resp = inv.getArgument(1);
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return null;
        }).when(customAuthEntryPoint).commence(any(), any(), any());
    }

    private static final String USER_ID = "uid-test";
    private static final UUID SESSION_ID = UUID.randomUUID();

    private static UsernamePasswordAuthenticationToken businessAuth() {
        return new UsernamePasswordAuthenticationToken(
            USER_ID, null, List.of(new SimpleGrantedAuthority("ROLE_BUSINESS"))
        );
    }

    // ── POST /api/v1/analyses/preview ─────────────────────────────────────────

    @Test
    void previewAnalysis_returns200_withValidRequest() throws Exception {
        when(analysisService.preview(eq(USER_ID), any()))
            .thenReturn(new PlaceSearchResponse(List.of()));

        mockMvc.perform(post("/api/v1/analyses/preview")
                .with(authentication(businessAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "nicheCode": "COFFEE",
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 2.0,
                          "maxCompetitors": 5
                        }
                        """))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void previewAnalysis_returns400_whenNicheCodeMissing() throws Exception {
        mockMvc.perform(post("/api/v1/analyses/preview")
                .with(authentication(businessAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 2.0,
                          "maxCompetitors": 5
                        }
                        """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void previewAnalysis_returns400_whenRadiusExceedsMax() throws Exception {
        mockMvc.perform(post("/api/v1/analyses/preview")
                .with(authentication(businessAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "nicheCode": "COFFEE",
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 50.0,
                          "maxCompetitors": 5
                        }
                        """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void previewAnalysis_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/analyses/preview")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "nicheCode": "COFFEE",
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 2.0,
                          "maxCompetitors": 5
                        }
                        """))
            .andExpect(status().isUnauthorized());
    }

    // ── POST /api/v1/analyses ─────────────────────────────────────────────────

    @Test
    void createAnalysis_returns202_withValidRequest() throws Exception {
        AnalysisStatusResponse response = new AnalysisStatusResponse(
            SESSION_ID, AnalysisStage.COLLECTING_DATA, 20, SessionStatus.PENDING, 0
        );
        when(analysisService.create(eq(USER_ID), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/analyses")
                .with(authentication(businessAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "nicheCode": "COFFEE",
                          "reportName": "My Report",
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 2.0,
                          "selectedPlaces": [{"placeId": "place-1", "name": "Cafe A"}]
                        }
                        """))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.stage").value("COLLECTING_DATA"))
            .andExpect(jsonPath("$.progress").value(20));
    }

    @Test
    void createAnalysis_returns400_whenSelectedPlacesEmpty() throws Exception {
        mockMvc.perform(post("/api/v1/analyses")
                .with(authentication(businessAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "nicheCode": "COFFEE",
                          "reportName": "My Report",
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 2.0,
                          "selectedPlaces": []
                        }
                        """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createAnalysis_returns400_whenReportNameBlank() throws Exception {
        mockMvc.perform(post("/api/v1/analyses")
                .with(authentication(businessAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "nicheCode": "COFFEE",
                          "reportName": "  ",
                          "location": {"latitude": 50.45, "longitude": 30.52},
                          "radiusKm": 2.0,
                          "selectedPlaces": [{"placeId": "place-1", "name": "Cafe A"}]
                        }
                        """))
            .andExpect(status().isBadRequest());
    }

    // ── GET /api/v1/analyses/{id} ─────────────────────────────────────────────

    @Test
    void getStatus_returns200_withSessionData() throws Exception {
        AnalysisStatusResponse response = new AnalysisStatusResponse(
            SESSION_ID, AnalysisStage.ANONYMIZING, 40, SessionStatus.RUNNING, 3
        );
        when(analysisService.getStatus(USER_ID, SESSION_ID)).thenReturn(response);

        mockMvc.perform(get("/api/v1/analyses/{id}", SESSION_ID)
                .with(authentication(businessAuth())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stage").value("ANONYMIZING"))
            .andExpect(jsonPath("$.progress").value(40))
            .andExpect(jsonPath("$.competitorsCount").value(3));
    }

    @Test
    void getStatus_returns404_whenSessionNotFound() throws Exception {
        when(analysisService.getStatus(USER_ID, SESSION_ID))
            .thenThrow(new ResourceNotFoundException("Session not found"));

        mockMvc.perform(get("/api/v1/analyses/{id}", SESSION_ID)
                .with(authentication(businessAuth())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void getStatus_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/analyses/{id}", SESSION_ID))
            .andExpect(status().isUnauthorized());
    }
}
