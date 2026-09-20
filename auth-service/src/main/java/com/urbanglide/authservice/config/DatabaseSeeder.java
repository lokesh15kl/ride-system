package com.urbanglide.authservice.config;

import com.urbanglide.authservice.model.User;
import com.urbanglide.authservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DatabaseSeeder {

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository) {
        return args -> {
            seedDriver(userRepository, "bike1", "1234");
            seedDriver(userRepository, "auto1", "1234");
            seedDriver(userRepository, "car1", "1234");
            seedDriver(userRepository, "erickshaw1", "1234");

            // Also ensure the admin account exists
            if (userRepository.findByUsername("admin").isEmpty()) {
                userRepository.save(new User("admin", "1234", "ADMIN"));
            }
        };
    }

    private void seedDriver(UserRepository userRepository, String username, String password) {
        if (userRepository.findByUsername(username).isEmpty()) {
            userRepository.save(new User(username, password, "DRIVER")); // Plaintext since normal login uses it
        }
    }
}
