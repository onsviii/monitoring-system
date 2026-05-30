package ua.bkr.monitor.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {

        return ResponseEntity.ok(placesService.search(query, new Location(lat, lng)));
    }
}
