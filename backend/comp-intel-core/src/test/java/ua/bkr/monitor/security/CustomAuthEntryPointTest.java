package ua.bkr.monitor.security;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThat;

class CustomAuthEntryPointTest {

    @Test
    void commence_setsUnauthorizedJsonResponse() throws Exception {
        CustomAuthEntryPoint entryPoint = new CustomAuthEntryPoint();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response, new BadCredentialsException("bad"));

        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(response.getContentType()).isEqualTo("application/json");
        assertThat(response.getContentAsString()).contains("Invalid or expired token");
        assertThat(response.getContentAsString()).contains("401");
    }
}
