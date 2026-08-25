package com.dermasense.auth.controller;

import com.dermasense.auth.dto.AuthResponse;
import com.dermasense.auth.dto.RegisterRequest;
import com.dermasense.auth.dto.SkinProfileRequest;
import com.dermasense.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private String validJwtToken;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();

        RegisterRequest register = new RegisterRequest("Shreya", "shreya@dermasense.ai", "securePass123");
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        this.validJwtToken = authResponse.getToken();
    }

    @Test
    @DisplayName("GET /api/users/me - 401 Unauthorized when no JWT token provided")
    void getCurrentUser_NoToken_Returns401() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/users/me - 200 OK with user profile when valid JWT provided")
    void getCurrentUser_WithValidToken_Returns200() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + validJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Shreya")))
                .andExpect(jsonPath("$.email", is("shreya@dermasense.ai")))
                .andExpect(jsonPath("$.createdAt", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/users/me/profile - 200 OK with skin profile")
    void getSkinProfile_WithValidToken_Returns200() throws Exception {
        mockMvc.perform(get("/api/users/me/profile")
                        .header("Authorization", "Bearer " + validJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.userId", notNullValue()));
    }

    @Test
    @DisplayName("PUT /api/users/me/profile - 200 OK with updated skin profile data")
    void updateSkinProfile_WithValidToken_ReturnsUpdatedProfile() throws Exception {
        SkinProfileRequest updateRequest = new SkinProfileRequest(
                "Combination",
                "Medium",
                List.of("Fragrance", "Parabens"),
                List.of("Anti-aging", "Hydration")
        );

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", "Bearer " + validJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skinType", is("Combination")))
                .andExpect(jsonPath("$.sensitivity", is("Medium")))
                .andExpect(jsonPath("$.allergies", hasItems("Fragrance", "Parabens")))
                .andExpect(jsonPath("$.goals", hasItems("Anti-aging", "Hydration")));
    }
}
