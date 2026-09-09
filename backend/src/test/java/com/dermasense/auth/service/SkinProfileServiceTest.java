package com.dermasense.auth.service;

import com.dermasense.auth.dto.SkinProfileRequest;
import com.dermasense.auth.dto.SkinProfileResponse;
import com.dermasense.auth.entity.SkinProfile;
import com.dermasense.auth.entity.User;
import com.dermasense.auth.repository.SkinProfileRepository;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkinProfileServiceTest {

    @Mock
    private SkinProfileRepository skinProfileRepository;

    @Mock
    private UserRepository userRepository;

    private UserService userService;
    private SkinProfileService skinProfileService;

    private User sampleUser;
    private SkinProfile sampleProfile;
    private final UUID sampleUserId = UUID.randomUUID();
    private final UUID sampleProfileId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
        skinProfileService = new SkinProfileService(skinProfileRepository, userService);

        sampleUser = new User("Shreya Sharma", "shreya@dermasense.ai", "encoded_password");
        sampleUser.setId(sampleUserId);

        sampleProfile = new SkinProfile(sampleUser);
        sampleProfile.setId(sampleProfileId);
        sampleProfile.setSkinType("Combination");
        sampleProfile.setSensitivity("Medium");
        sampleProfile.setAllergies(Arrays.asList("Fragrance", "Parabens"));
        sampleProfile.setGoals(Arrays.asList("Hydration", "Acne prevention"));
    }

    @Test
    @DisplayName("getProfileByEmail: returns existing skin profile")
    void getProfileByEmail_ReturnsExistingProfile() {
        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));
        when(skinProfileRepository.findByUserId(sampleUserId)).thenReturn(Optional.of(sampleProfile));

        SkinProfileResponse response = skinProfileService.getProfileByEmail("shreya@dermasense.ai");

        assertNotNull(response);
        assertEquals(sampleProfileId, response.getId());
        assertEquals(sampleUserId, response.getUserId());
        assertEquals("Combination", response.getSkinType());
        assertEquals("Medium", response.getSensitivity());
        assertEquals(2, response.getAllergies().size());
        assertTrue(response.getAllergies().contains("Fragrance"));
        assertEquals(2, response.getGoals().size());
    }

    @Test
    @DisplayName("updateProfileByEmail: updates profile fields and returns updated response")
    void updateProfileByEmail_UpdatesAndReturnsProfile() {
        SkinProfileRequest request = new SkinProfileRequest(
                "Oily",
                "High",
                List.of("Sulfates", "Retinol"),
                List.of("Anti-aging", "Oil control")
        );

        when(userRepository.findByEmail("shreya@dermasense.ai")).thenReturn(Optional.of(sampleUser));
        when(skinProfileRepository.findByUserId(sampleUserId)).thenReturn(Optional.of(sampleProfile));
        when(skinProfileRepository.save(any(SkinProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SkinProfileResponse response = skinProfileService.updateProfileByEmail("shreya@dermasense.ai", request);

        assertNotNull(response);
        assertEquals("Oily", response.getSkinType());
        assertEquals("High", response.getSensitivity());
        assertTrue(response.getAllergies().contains("Sulfates"));
        assertTrue(response.getGoals().contains("Anti-aging"));
        verify(skinProfileRepository).save(sampleProfile);
    }
}
