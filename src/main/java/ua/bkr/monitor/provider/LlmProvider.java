package ua.bkr.monitor.provider;

import java.util.List;
import java.util.Map;

public interface LlmProvider {
    String generate(List<Map<String, String>> messages, double temperature);
    String getProviderName();
}