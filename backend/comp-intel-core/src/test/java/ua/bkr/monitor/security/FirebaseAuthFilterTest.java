package ua.bkr.monitor.security;

import com.google.firebase.ErrorCode;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirebaseAuthFilterTest {

    @Mock private FirebaseAuth firebaseAuth;
    @Mock private FirebaseToken firebaseToken;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_skipsWhenNoAuthorizationHeader() throws Exception {
        FirebaseAuthFilter filter = new FirebaseAuthFilter(firebaseAuth);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilter_setsAuthenticationWhenRoleProvided() throws Exception {
        FirebaseAuthFilter filter = new FirebaseAuthFilter(firebaseAuth);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(firebaseAuth.verifyIdToken("token")).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn("uid-1");
        when(firebaseToken.getClaims()).thenReturn(Map.of("role", "operator"));

        filter.doFilter(request, response, new MockFilterChain());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo("uid-1");
        assertThat(auth.getAuthorities()).extracting("authority").contains("ROLE_OPERATOR");
        assertThat(response.getHeader("X-Refresh-Token")).isNull();
    }

    @Test
    void doFilter_assignsDefaultRoleAndSetsRefreshHeader() throws Exception {
        FirebaseAuthFilter filter = new FirebaseAuthFilter(firebaseAuth);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(firebaseAuth.verifyIdToken("token")).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn("uid-2");
        when(firebaseToken.getClaims()).thenReturn(Map.of());

        filter.doFilter(request, response, new MockFilterChain());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting("authority").contains("ROLE_BUSINESS");
        assertThat(response.getHeader("X-Refresh-Token")).isEqualTo("true");
    }

    @Test
    void doFilter_skipsRefreshHeaderWhenRoleAssignmentFails() throws Exception {
        FirebaseAuthFilter filter = new FirebaseAuthFilter(firebaseAuth);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(firebaseAuth.verifyIdToken("token")).thenReturn(firebaseToken);
        when(firebaseToken.getUid()).thenReturn("uid-3");
        when(firebaseToken.getClaims()).thenReturn(Map.of());
        doThrow(new FirebaseAuthException(ErrorCode.UNKNOWN, "failed", null, null, null))
                .when(firebaseAuth).setCustomUserClaims("uid-3", Map.of("role", "BUSINESS"));

        filter.doFilter(request, response, new MockFilterChain());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).extracting("authority").contains("ROLE_BUSINESS");
        assertThat(response.getHeader("X-Refresh-Token")).isNull();
    }

    @Test
    void doFilter_doesNotAuthenticateOnInvalidToken() throws Exception {
        FirebaseAuthFilter filter = new FirebaseAuthFilter(firebaseAuth);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer bad");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(firebaseAuth.verifyIdToken("bad"))
                .thenThrow(new FirebaseAuthException(ErrorCode.UNKNOWN, "invalid", null, null, null));

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
