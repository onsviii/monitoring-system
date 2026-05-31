package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.NicheDto;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.repository.NicheRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NicheServiceTest {

    @Mock private NicheRepository nicheRepository;
    @InjectMocks private NicheService service;

    @Test
    void getAllNiches_mapsCodeAndDisplayName() {
        Niche niche = new Niche();
        niche.setCode("COFFEE");
        niche.setDisplayName("Coffee Shops");
        when(nicheRepository.findAll()).thenReturn(List.of(niche));

        List<NicheDto> result = service.getAllNiches();

        assertThat(result).containsExactly(new NicheDto("COFFEE", "Coffee Shops"));
    }
}
