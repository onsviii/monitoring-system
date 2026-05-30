package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.NicheDto;
import ua.bkr.monitor.repository.NicheRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NicheService {

    private final NicheRepository nicheRepository;

    @Transactional(readOnly = true)
    public List<NicheDto> getAllNiches() {
        return nicheRepository.findAll().stream()
                .map(niche -> new NicheDto(niche.getCode(), niche.getDisplayName()))
                .toList();
    }
}