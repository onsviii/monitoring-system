package ua.bkr.monitor.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ua.bkr.monitor.dto.NicheDto;
import ua.bkr.monitor.service.NicheService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/niches")
@RequiredArgsConstructor
public class NicheController {

    private final NicheService nicheService;

    /**
     * GET /api/v1/niches — отримання списку всіх підтримуваних ніш бізнесу.
     * Використовується фронтендом для відображення опцій у формах.
     */
    @GetMapping
    public ResponseEntity<List<NicheDto>> getAllNiches(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(nicheService.getAllNiches());
    }
}