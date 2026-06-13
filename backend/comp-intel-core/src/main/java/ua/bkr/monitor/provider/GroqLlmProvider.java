package ua.bkr.monitor.provider;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Component("groqProvider")
public class GroqLlmProvider implements LlmProvider {
    private RestClient restClient;

    @Value("${groq.api-url}")
    private String groqUrl;

    @Value("${groq.api-key}")
    private String apiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;


    @PostConstruct
    public void init() {
        this.restClient = RestClient.builder()
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    @Override
    public String generate(List<Map<String, String>> messages, double temperature) {
        int maxRetries = 3;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = restClient.post()
                        .uri(groqUrl)
                        .body(Map.of(
                                "model", model,
                                "messages", messages,
                                "temperature", temperature,
                                "max_tokens", 4096
                        ))
                        .retrieve()
                        .body(Map.class);

                return extractContent(response);

            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 429 && attempt < maxRetries) {
                    long delay = parseRetryAfter(e, attempt);
                    log.warn("Groq 429 rate limit, retry {}/{} after {}ms",
                            attempt, maxRetries, delay);
                    sleep(delay);
                } else {
                    throw new RuntimeException("LLM call failed: " + e.getMessage(), e);
                }
            }
        }
        throw new RuntimeException("LLM call failed after " + maxRetries + " retries");
    }

    private long parseRetryAfter(HttpClientErrorException e, int attempt) {
        String retryAfter = e.getResponseHeaders() != null
                ? e.getResponseHeaders().getFirst("retry-after")
                : null;
        if (retryAfter != null) {
            try {
                return (long) (Double.parseDouble(retryAfter) * 1000) + 500;
            } catch (NumberFormatException ignored) {}
        }
        return (long) Math.pow(2, attempt) * 2000;
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    @Override
    public String getProviderName() {
        return "GROQ_" + model;
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> response) {
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }
}