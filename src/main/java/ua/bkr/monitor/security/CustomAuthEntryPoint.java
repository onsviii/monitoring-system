package ua.bkr.monitor.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import ua.bkr.monitor.dto.ErrorResponse;

import java.io.IOException;

@Component
public class CustomAuthEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException ex) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        objectMapper.writeValue(
                response.getOutputStream(),
                new ErrorResponse(401, "Invalid or expired token")
        );
    }
}