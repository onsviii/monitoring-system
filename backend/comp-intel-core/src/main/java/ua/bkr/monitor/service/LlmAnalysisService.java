package ua.bkr.monitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import ua.bkr.monitor.dto.AggregatedStatistics;
import ua.bkr.monitor.model.LLMInteractionLog;
import ua.bkr.monitor.model.record.ChatTurn;
import ua.bkr.monitor.model.record.ExtractedCharacteristic;
import ua.bkr.monitor.model.record.GeneratedRecommendation;
import ua.bkr.monitor.model.record.IndexedReview;
import ua.bkr.monitor.provider.LlmProvider;
import ua.bkr.monitor.repository.AnalysisSessionRepository;
import ua.bkr.monitor.repository.LLMInteractionLogRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class LlmAnalysisService {
    private final LlmProvider llmProvider;
    private final ObjectMapper objectMapper;
    private final LLMInteractionLogRepository logRepository;
    private final AnalysisSessionRepository sessionRepository;

    private static final double TEMPERATURE_LOW  = 0.2;
    private static final double TEMPERATURE_CHAT = 0.4;

    public LlmAnalysisService(
            LlmProvider llmProvider,
            ObjectMapper objectMapper,
            LLMInteractionLogRepository logRepository,
            AnalysisSessionRepository sessionRepository
    ) {
        this.llmProvider = llmProvider;
        this.objectMapper = objectMapper;
        this.logRepository = logRepository;
        this.sessionRepository = sessionRepository;
    }

    public List<ExtractedCharacteristic> extractCharacteristics(
            String competitorName, List<IndexedReview> reviews, UUID sessionId) {

        String system = """
                Ти — аналітик клієнтського досвіду. Проаналізуй відгуки про заклад "%s" \
                та виокреми унікальні характеристики, які НЕ належать до жодної з цих \
                категорій: сервіс, якість продукту, ціна, локація.
                
                Шукай специфічні деталі: атмосфера, особливості меню, паркування, \
                дитяча зона, Wi-Fi, інтер'єр, час очікування тощо.
                
                Правила:
                - До 5 унікальних характеристик
                - Коротка фраза до 7 слів
                - Без семантичних дублів
                - Для кожної — індекси відгуків-першоджерел
                - Якщо таких характеристик немає, то не вигадуй їх
                
                Відповідай ТІЛЬКИ у форматі JSON (без markdown):
                [{"text": "Затишна літня тераса", "sourceIndices": [0, 3]}]
                """.formatted(competitorName);

        String response = call(system, formatReviews(reviews),
                TEMPERATURE_LOW, sessionId, "CHARACTERISTICS");

        return parseList(response, ExtractedCharacteristic.class);
    }

    public List<GeneratedRecommendation> generateRecommendations(
            String businessNiche, AggregatedStatistics stats,
            List<ExtractedCharacteristic> characteristics,
            List<IndexedReview> allReviews, UUID sessionId) {

        String system = """
                Ти — бізнес-консультант для малого підприємства у ніші "%s". \
                Сформуй до 7 конкретних управлінських рекомендацій виключно на основі \
                наданих даних аналізу конкурентів.
                
                Правила:
                - Кожна рекомендація базується ТІЛЬКИ на наданих даних
                - Для кожної — індекси відгуків що її обґрунтовують
                - Конкретно і дієво: що саме зробити
                - Мова — українська
                
                Відповідай ТІЛЬКИ у форматі JSON (без markdown):
                [{"text": "Текст рекомендації", "sourceIndices": [1, 5]}]
                """.formatted(businessNiche);

        String user = """
                СТАТИСТИКА ТОНАЛЬНОСТІ КОНКУРЕНТІВ:
                %s
                
                УНІКАЛЬНІ ХАРАКТЕРИСТИКИ КОНКУРЕНТІВ:
                %s
                
                ВІДГУКИ-ПЕРШОДЖЕРЕЛА:
                %s
                """.formatted(
                formatStatistics(stats),
                formatCharacteristics(characteristics),
                formatReviews(allReviews)
        );

        String response = call(system, user, TEMPERATURE_LOW, sessionId, "RECOMMENDATIONS");

        return parseList(response, GeneratedRecommendation.class);
    }

    public String chat(String userMessage, String reportContext, List<ChatTurn> history, UUID sessionId) {
        String system = """
                Ти — AI-асистент для інтерпретації результатів аналізу конкурентного \
                середовища. Відповідай ВИКЛЮЧНО на основі наданого контексту звіту. \
                Якщо інформації недостатньо — скажи про це чесно. \
                Це дорадчий інструмент; кінцеве рішення приймає користувач.
                
                КОНТЕКСТ ЗВІТУ:
                %s
                """.formatted(reportContext);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", system));

        for (ChatTurn turn : history) {
            messages.add(Map.of("role", turn.role().toLowerCase(), "content", turn.text()));
        }

        messages.add(Map.of("role", "user", "content", userMessage));

        return callWithMessages(messages, TEMPERATURE_CHAT, sessionId, "CHAT");
    }

    private String call(String system, String user, double temperature,
                        UUID sessionId, String component) {
        return callWithMessages(
                List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user",   "content", user)
                ),
                temperature, sessionId, component
        );
    }

    private String callWithMessages(List<Map<String, String>> messages,
                                    double temperature, UUID sessionId,
                                    String component) {
        String promptLog = messages.stream()
                .map(m -> "[" + m.get("role") + "]: " + m.get("content"))
                .reduce("", (a, b) -> a + "\n---\n" + b);

        try {
            String content = llmProvider.generate(messages, temperature);
            saveLog(sessionId, component, promptLog, content, llmProvider.getProviderName());
            return content;
        } catch (Exception e) {
            log.error("LLM Provider [{}] error [{}] session {}: {}",
                    llmProvider.getProviderName(), component, sessionId, e.getMessage());
            saveLog(sessionId, component, promptLog, "ERROR: " + e.getMessage(), llmProvider.getProviderName());
            throw new RuntimeException("LLM call failed via " + llmProvider.getProviderName() + ": " + e.getMessage(), e);
        }
    }

    private <T> List<T> parseList(String json, Class<T> type) {
        try {
            String clean = json
                    .replaceAll("(?s)```json\\s*", "")
                    .replace("```", "")
                    .trim();
            return objectMapper.readValue(
                    clean,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, type)
            );
        } catch (Exception e) {
            log.error("Failed to parse JSON response: {}", json);
            throw new RuntimeException("JSON parsing failed", e);
        }
    }

    private void saveLog(UUID sessionId, String component, String prompt, String response, String providerName) {
        try {
            sessionRepository.findById(sessionId).ifPresent(session -> {
                LLMInteractionLog entry = new LLMInteractionLog();
                entry.setSession(session);
                entry.setComponentType(component + " [" + providerName + "]");
                entry.setPromptIn(prompt);
                entry.setResponseOut(response);
                entry.setTimestamp(LocalDateTime.now());
                logRepository.save(entry);
            });
        } catch (Exception e) {
            log.warn("Failed to save LLM interaction log: {}", e.getMessage());
        }
    }

    private String formatStatistics(AggregatedStatistics stats) {
        if (stats == null) return "Дані відсутні.";

        StringBuilder sb = new StringBuilder();

        sb.append("1. Аспектні оцінки (від -1.0 до +1.0):\n");
        if (stats.radarChart() != null) {
            for (AggregatedStatistics.CompetitorAspectProfile profile : stats.radarChart()) {
                sb.append(" - ").append(profile.competitorName()).append(":\n");
                profile.aspects().forEach((aspect, value) ->
                        sb.append(String.format("   * %s: %.2f\n", aspect.getDisplayName(), value))
                );
            }
        }

        sb.append("\n2. Позиціонування (Ціна vs Якість):\n");
        if (stats.positioningMatrix() != null) {
            for (AggregatedStatistics.PositioningPoint point : stats.positioningMatrix()) {
                sb.append(String.format(" - %s: Ціна (%.2f), Якість (%.2f)\n",
                        point.competitorName(), point.priceSentiment(), point.qualitySentiment()));
            }
        }

        return sb.toString();
    }

    private String formatCharacteristics(List<ExtractedCharacteristic> characteristics) {
        if (characteristics == null || characteristics.isEmpty()) {
            return "Специфічних характеристик не виявлено.\n";
        }

        StringBuilder sb = new StringBuilder();
        for (ExtractedCharacteristic c : characteristics) {
            sb.append(" - ").append(c.text())
                    .append(" (Відгуки: ").append(c.sourceIndices()).append(")\n");
        }
        return sb.toString();
    }

    private String formatReviews(List<IndexedReview> reviews) {
        if (reviews == null || reviews.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (IndexedReview r : reviews) {
            sb.append("[").append(r.index()).append("] ").append(r.text()).append("\n");
        }
        return sb.toString();
    }
}