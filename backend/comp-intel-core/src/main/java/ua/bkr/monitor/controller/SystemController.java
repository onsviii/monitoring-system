package ua.bkr.monitor.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.bkr.monitor.dto.LogEntryResponse;
import ua.bkr.monitor.dto.MetricResponse;
import ua.bkr.monitor.model.enums.LogType;
import ua.bkr.monitor.service.MonitoringService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/system")
@PreAuthorize("hasRole('OPERATOR')")
@RequiredArgsConstructor
public class SystemController {

    private final MonitoringService monitoringService;

    @GetMapping("/metrics")
    public ResponseEntity<List<MetricResponse>> getMetrics() {
        return ResponseEntity.ok(monitoringService.getMetrics());
    }

    @GetMapping("/logs")
    public ResponseEntity<List<LogEntryResponse>> getLogs(
            @RequestParam(required = false) LogType type) {

        return ResponseEntity.ok(monitoringService.getLogs(type));
    }
}
