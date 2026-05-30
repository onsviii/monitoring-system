package ua.bkr.monitor.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ua.bkr.monitor.dto.PlaceSearchResponse;
import ua.bkr.monitor.model.record.Location;
import ua.bkr.monitor.service.PlacesService;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlacesController {
    private final PlacesService placesService;

    @GetMapping("/search")
    public ResponseEntity<PlaceSearchResponse> search(
            @RequestParam String query,
            @RequestParam String nicheCode,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        PlaceSearchResponse response = placesService.search(query, nicheCode, new Location(lat, lng));
        return ResponseEntity.ok(response);
    }
}
