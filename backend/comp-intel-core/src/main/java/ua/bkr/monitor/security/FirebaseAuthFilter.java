package ua.bkr.monitor.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ua.bkr.monitor.model.enums.Role;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class FirebaseAuthFilter extends OncePerRequestFilter {

    private final FirebaseAuth firebaseAuth;

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String DEFAULT_ROLE = Role.BUSINESS.name();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader(AUTH_HEADER);

        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String idToken = authHeader.substring(BEARER_PREFIX.length());

        try {
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(idToken);
            String uid = decodedToken.getUid();
            String role = extractRole(decodedToken);

            if (role == null) {
                role = DEFAULT_ROLE;
                if (assignDefaultRole(uid)) {
                    response.setHeader("X-Refresh-Token", "true");
                }
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            uid,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                    );

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (FirebaseAuthException e) {
            log.warn("Invalid Firebase token: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String extractRole(FirebaseToken token) {
        Object roleClaim = token.getClaims().get("role");

        if (roleClaim instanceof String role && !role.isBlank()) {
            return role;
        }

        return null;
    }

    private boolean assignDefaultRole(String uid) {
        try {
            firebaseAuth.setCustomUserClaims(uid, Map.of("role", DEFAULT_ROLE));
            log.info("Default role '{}' assigned to uid={}", DEFAULT_ROLE, uid);
            return true;
        } catch (FirebaseAuthException e) {
            log.error("Failed to assign default role to uid={}: {}", uid, e.getMessage());
            return false;
        }
    }
}