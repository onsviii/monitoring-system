package ua.bkr.monitor.provider;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import ua.bkr.monitor.provider.dto.AspectClassification;
import ua.bkr.monitor.model.enums.Aspect;
import ua.bkr.monitor.provider.dto.AspectResult;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MlServiceClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void anonymize_returnsTexts() throws IOException {
        String baseUrl = startServer(Map.of(
                "/anonymize",
                exchange -> sendJson(exchange, 200, "{\"texts\":[\"anon a\",\"anon b\"]}")
        ));

        MlServiceClient client = buildClient(baseUrl);

        List<String> result = client.anonymize(List.of("a", "b"));

        assertThat(result).containsExactly("anon a", "anon b");
    }

    @Test
    void anonymize_returnsEmptyWhenTextsMissing() throws IOException {
        String baseUrl = startServer(Map.of(
                "/anonymize",
                exchange -> sendJson(exchange, 200, "{}")
        ));

        MlServiceClient client = buildClient(baseUrl);

        List<String> result = client.anonymize(List.of("a"));

        assertThat(result).isEmpty();
    }

    @Test
    void anonymize_throwsWhenServiceFails() throws IOException {
        String baseUrl = startServer(Map.of(
                "/anonymize",
                exchange -> sendJson(exchange, 500, "{}")
        ));

        MlServiceClient client = buildClient(baseUrl);

        assertThatThrownBy(() -> client.anonymize(List.of("a")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("ML Service anonymization failed");
    }

    @Test
    void classify_parsesPredictionsAndIgnoresUnknown() throws IOException {
        String baseUrl = startServer(Map.of(
                "/classify",
                exchange -> sendJson(exchange, 200,
                        "{\"predictions\":[{\"service\":{\"polarity\":1,\"confidence\":0.9}," +
                                "\"price\":{\"polarity\":-1,\"confidence\":0.6}," +
                                "\"unknown\":{\"polarity\":1,\"confidence\":0.2}," +
                                "\"location\":null}]}"
                )
        ));

        MlServiceClient client = buildClient(baseUrl);

        List<AspectClassification> results = client.classify(List.of("text"));

        assertThat(results).hasSize(1);
        Map<Aspect, AspectResult> aspects = results.get(0).aspects();
        assertThat(aspects).containsKeys(Aspect.SERVICE, Aspect.PRICE);
        assertThat(aspects.get(Aspect.SERVICE).polarity()).isEqualTo(1);
        assertThat(aspects.get(Aspect.PRICE).polarity()).isEqualTo(-1);
    }

    @Test
    void classify_returnsEmptyWhenPredictionsMissing() throws IOException {
        String baseUrl = startServer(Map.of(
                "/classify",
                exchange -> sendJson(exchange, 200, "{}")
        ));

        MlServiceClient client = buildClient(baseUrl);

        assertThat(client.classify(List.of("text"))).isEmpty();
    }

    @Test
    void isHealthy_reflectsHealthEndpoint() throws IOException {
        String healthyBaseUrl = startServer(Map.of(
                "/health",
                exchange -> sendJson(exchange, 200, "{}")
        ));
        MlServiceClient healthyClient = buildClient(healthyBaseUrl);
        assertThat(healthyClient.isHealthy()).isTrue();

        server.stop(0);
        server = null;

        String failingBaseUrl = startServer(Map.of(
                "/health",
                exchange -> sendJson(exchange, 500, "{}")
        ));
        MlServiceClient failingClient = buildClient(failingBaseUrl);
        assertThat(failingClient.isHealthy()).isFalse();
    }

    private String startServer(Map<String, HttpHandler> handlers) throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        for (Map.Entry<String, HttpHandler> entry : handlers.entrySet()) {
            server.createContext(entry.getKey(), entry.getValue());
        }
        server.start();
        return "http://localhost:" + server.getAddress().getPort();
    }

    private MlServiceClient buildClient(String baseUrl) {
        MlServiceClient client = new MlServiceClient();
        ReflectionTestUtils.setField(client, "baseUrl", baseUrl);
        client.init();
        return client;
    }

    private static void sendJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, payload.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(payload);
        }
        exchange.close();
    }
}
