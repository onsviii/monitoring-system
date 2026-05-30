package ua.bkr.monitor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ua.bkr.monitor.dto.PlaceSearchResponse;
import ua.bkr.monitor.exception.ResourceNotFoundException;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.provider.GooglePlacesClient;
import ua.bkr.monitor.provider.GooglePlacesClient.PlaceInfo;
import ua.bkr.monitor.provider.mapper.GooglePlacesMapper;
import ua.bkr.monitor.repository.NicheRepository;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlacesService {
    private final NicheRepository nicheRepository;
    private final GooglePlacesClient googlePlacesClient;
    private final GooglePlacesMapper googlePlacesMapper;

    /**
     * Пошук конкурентів на основі конфігурації ніші з бази даних.
     */
    @Transactional(readOnly = true)
    public PlaceSearchResponse findCompetitors(String nicheCode, Location location, int radiusKm, int maxResults) {
        log.info("Fetching google types for niche code: {}", nicheCode);

        Niche niche = nicheRepository.findByCode(nicheCode)
                .orElseThrow(() -> new ResourceNotFoundException("Niche not supported: " + nicheCode));

        List<String> googleTypes = niche.getGoogleTypes().stream().toList();

        log.info("Searching competitors for types {} around [{}, {}] within {}km",
                googleTypes, location.latitude(), location.longitude(), radiusKm);

        List<PlaceInfo> places = googlePlacesClient.searchCompetitors(
                googleTypes, location, radiusKm, maxResults, null);

        return googlePlacesMapper.toPlaceSearchResponse(places);
    }

    /**
     * Вільний пошук закладу за текстовим запитом (для профілю).
     */
    public PlaceSearchResponse search(String query, Location location) {
        log.info("Executing free search for query: {}", query);
        List<PlaceInfo> places = googlePlacesClient.search(query, location);
        return googlePlacesMapper.toPlaceSearchResponse(places);
    }
}