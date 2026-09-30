package com.dermasense.auth.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * SkinProfile is embedded as a subdocument inside the User document.
 * No @Document annotation needed — it's not a top-level collection.
 */
public class SkinProfile {

    private String skinType;
    private String sensitivity;
    private List<String> allergies = new ArrayList<>();
    private List<String> goals = new ArrayList<>();
    private Instant updatedAt;

    public SkinProfile() {
        this.updatedAt = Instant.now();
    }

    public String getSkinType() { return skinType; }
    public void setSkinType(String skinType) {
        this.skinType = skinType;
        this.updatedAt = Instant.now();
    }

    public String getSensitivity() { return sensitivity; }
    public void setSensitivity(String sensitivity) {
        this.sensitivity = sensitivity;
        this.updatedAt = Instant.now();
    }

    public List<String> getAllergies() { return allergies; }
    public void setAllergies(List<String> allergies) {
        this.allergies = (allergies != null) ? allergies : new ArrayList<>();
        this.updatedAt = Instant.now();
    }

    public List<String> getGoals() { return goals; }
    public void setGoals(List<String> goals) {
        this.goals = (goals != null) ? goals : new ArrayList<>();
        this.updatedAt = Instant.now();
    }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
