package ua.bkr.monitor.provider;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
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
        } catch (Exception e) {
            log.error("Groq API error: {}", e.getMessage());
            throw new RuntimeException("LLM call failed: " + e.getMessage(), e);
        }
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