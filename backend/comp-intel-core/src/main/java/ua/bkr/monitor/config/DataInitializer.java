package ua.bkr.monitor.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import ua.bkr.monitor.model.Niche;
import ua.bkr.monitor.repository.NicheRepository;

import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final NicheRepository nicheRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (nicheRepository.count() > 0) {
            return;
        }

        List<Niche> niches = List.of(
                niche("coffee_shop",  "Кав'ярня",     Set.of("cafe", "coffee_shop")),
                niche("restaurant",   "Ресторан",      Set.of("restaurant")),
                niche("barbershop",   "Барбершоп",     Set.of("barber_shop", "hair_salon")),
                niche("beauty_salon", "Салон краси",   Set.of("beauty_salon", "nail_salon")),
                niche("bakery",       "Пекарня",       Set.of("bakery")),
                niche("bar",          "Бар / Паб",     Set.of("bar")),
                niche("gym",          "Спортзал",      Set.of("gym", "fitness_center"))
        );

        nicheRepository.saveAll(niches);
        log.info("Seeded {} niches into the database", niches.size());
    }

    private Niche niche(String code, String displayName, Set<String> googleTypes) {
        Niche n = new Niche();
        n.setCode(code);
        n.setDisplayName(displayName);
        n.setGoogleTypes(googleTypes);
        return n;
    }
}
