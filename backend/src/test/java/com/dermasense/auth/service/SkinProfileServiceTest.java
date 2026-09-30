package com.dermasense.auth.service;

import com.dermasense.auth.dto.SkinProfileRequest;
import com.dermasense.auth.dto.SkinProfileResponse;
import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkinProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    private SkinProfileService skinProfileService;

    private User sampleUser;
    private final String sampleUserId = "507f1f77bcf86cd799439011"; // MongoDB ObjectId format

    @BeforeEach
    void setUp() {
        skinProfileService = new SkinProfileService(userRepository);

        // Build user with embedded SkinProfile
        sampleUser = new User("Shreya Sharma", "shreya@dermasense.ai", "encoded_password");
        sampleUser.setId(sampleUserId);

        SkinProfile profile = new SkinProfile();
        profile.setSkinType("Combination");
        profile.setSensitivity("Medium");
        profile.setAllergies(Arrays.asList("Fragrance", "Parabens"));
        profile.setGoals(Arrays.asList("Hydration", "Acne prevention"));
        sampleUser.setSkinProfile(profile);
    }

    @Test
    @DisplayName("getProfileByEmail: returns embedded skin profile from User document")
    void getProfileByEmail_ReturnsExistingProfile() {
        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));

        SkinProfileResponse response = skinProfileService.getProfileByEmail("shreya@dermasense.ai");

        assertNotNull(response);
        assertEquals(sampleUserId, response.getUserId());
        assertEquals("Combination", response.getSkinType());
        assertEquals("Medium", response.getSensitivity());
        assertEquals(2, response.getAllergies().size());
        assertTrue(response.getAllergies().contains("Fragrance"));
        assertEquals(2, response.getGoals().size());
    }

    @Test
    @DisplayName("getProfileByEmail: creates empty profile if none exists")
    void getProfileByEmail_CreatesProfileIfMissing() {
        sampleUser.setSkinProfile(null);
        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);

        SkinProfileResponse response = skinProfileService.getProfileByEmail("shreya@dermasense.ai");

        assertNotNull(response);
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("updateProfileByEmail: updates embedded profile fields and saves User document")
    void updateProfileByEmail_UpdatesAndReturnsProfile() {
        SkinProfileRequest request = new SkinProfileRequest(
                "Oily",
                "High",
                List.of("Sulfates", "Retinol"),
                List.of("Anti-aging", "Oil control")
        );

        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        SkinProfileResponse response = skinProfileService.updateProfileByEmail("shreya@dermasense.ai", request);

        assertNotNull(response);
        assertEquals("Oily", response.getSkinType());
        assertEquals("High", response.getSensitivity());
        assertTrue(response.getAllergies().contains("Sulfates"));
        assertTrue(response.getGoals().contains("Anti-aging"));
        verify(userRepository).save(any(User.class));
    }
}
