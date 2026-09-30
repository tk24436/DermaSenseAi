package com.dermasense.auth.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class SkinProfileResponse {

    private String id;
    private String userId;
    private String skinType;
    private String sensitivity;
    private List<String> allergies = new ArrayList<>();
    private List<String> goals = new ArrayList<>();
    private Instant updatedAt;

    public SkinProfileResponse() {}

    public SkinProfileResponse(String id, String userId, String skinType, String sensitivity,
                                List<String> allergies, List<String> goals, Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.skinType = skinType;
        this.sensitivity = sensitivity;
        this.allergies = (allergies != null) ? allergies : new ArrayList<>();
        this.goals = (goals != null) ? goals : new ArrayList<>();
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSkinType() { return skinType; }
    public void setSkinType(String skinType) { this.skinType = skinType; }

    public String getSensitivity() { return sensitivity; }
    public void setSensitivity(String sensitivity) { this.sensitivity = sensitivity; }

    public List<String> getAllergies() { return allergies; }
    public void setAllergies(List<String> allergies) {
        this.allergies = (allergies != null) ? allergies : new ArrayList<>();
    }

    public List<String> getGoals() { return goals; }
    public void setGoals(List<String> goals) {
        this.goals = (goals != null) ? goals : new ArrayList<>();
    }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
