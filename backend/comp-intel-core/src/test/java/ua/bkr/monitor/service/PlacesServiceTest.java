package ua.bkr.monitor.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ua.bkr.monitor.dto.PlaceSearchResponse;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.provider.GooglePlacesClient;
import ua.bkr.monitor.provider.GooglePlacesClient.PlaceInfo;
import ua.bkr.monitor.provider.mapper.GooglePlacesMapper;
import ua.bkr.monitor.repository.NicheRepository;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlacesServiceTest {

    @Mock private NicheRepository nicheRepository;
    @Mock private GooglePlacesClient googlePlacesClient;
    @Mock private GooglePlacesMapper googlePlacesMapper;
    @InjectMocks private PlacesService service;

    @Test
    void findCompetitors_usesNicheTypesAndMapsResponse() {
        Niche niche = new Niche();
        niche.setCode("COFFEE");
        niche.setGoogleTypes(new LinkedHashSet<>(List.of("cafe", "coffee_shop")));
        Location location = new Location(50.0, 30.0);
        List<PlaceInfo> placeInfos = List.of(
                new PlaceInfo("id-1", "Cafe", "Addr", "cafe", 4.5, location)
        );
        PlaceSearchResponse expected = new PlaceSearchResponse(List.of());

        when(nicheRepository.findByCode("COFFEE")).thenReturn(Optional.of(niche));
        when(googlePlacesClient.searchCompetitors(eq(List.of("cafe", "coffee_shop")), eq(location), eq(2.0), eq(5), isNull()))
                .thenReturn(placeInfos);
        when(googlePlacesMapper.toPlaceSearchResponse(placeInfos)).thenReturn(expected);

        PlaceSearchResponse result = service.findCompetitors("COFFEE", location, 2.0, 5);

        assertThat(result).isSameAs(expected);
        verify(googlePlacesClient).searchCompetitors(
                argThat(list -> list.containsAll(List.of("cafe", "coffee_shop")) && list.size() == 2),
                eq(location),
                eq(2.0),
                eq(5),
                isNull()
        );
    }

    @Test
    void findCompetitors_throwsWhenNicheMissing() {
        when(nicheRepository.findByCode("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.findCompetitors("UNKNOWN", new Location(1.0, 2.0), 1.0, 3))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void search_delegatesToClientAndMapper() {
        Niche niche = new Niche();
        niche.setCode("COFFEE");
        niche.setGoogleTypes(new LinkedHashSet<>(List.of("cafe")));
        Location location = new Location(null, null);
        List<PlaceInfo> placeInfos = List.of(
                new PlaceInfo("id-2", "Latte", "Addr", "cafe", 4.7, location)
        );
        PlaceSearchResponse expected = new PlaceSearchResponse(List.of());

        when(nicheRepository.findByCode("COFFEE")).thenReturn(Optional.of(niche));
        when(googlePlacesClient.search(eq("Latte"), eq(List.of("cafe")), eq(location))).thenReturn(placeInfos);
        when(googlePlacesMapper.toPlaceSearchResponse(placeInfos)).thenReturn(expected);

        PlaceSearchResponse result = service.search("Latte", "COFFEE", location);

        assertThat(result).isSameAs(expected);
        verify(googlePlacesClient).search(eq("Latte"), eq(List.of("cafe")), eq(location));
    }
}
