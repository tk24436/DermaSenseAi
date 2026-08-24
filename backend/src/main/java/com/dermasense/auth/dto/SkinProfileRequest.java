package com.dermasense.auth.dto;

import java.util.ArrayList;
import java.util.List;

public class SkinProfileRequest {

    private String skinType;
    private String sensitivity;
    private List<String> allergies = new ArrayList<>();
    private List<String> goals = new ArrayList<>();

    public SkinProfileRequest() {
    }

    public SkinProfileRequest(String skinType, String sensitivity, List<String> allergies, List<String> goals) {
        this.skinType = skinType;
        this.sensitivity = sensitivity;
        this.allergies = (allergies != null) ? allergies : new ArrayList<>();
        this.goals = (goals != null) ? goals : new ArrayList<>();
    }

    public String getSkinType() {
        return skinType;
    }

    public void setSkinType(String skinType) {
        this.skinType = skinType;
    }

    public String getSensitivity() {
        return sensitivity;
    }

    public void setSensitivity(String sensitivity) {
        this.sensitivity = sensitivity;
    }

    public List<String> getAllergies() {
        return allergies;
    }

    public void setAllergies(List<String> allergies) {
        this.allergies = (allergies != null) ? allergies : new ArrayList<>();
    }

    public List<String> getGoals() {
        return goals;
    }

    public void setGoals(List<String> goals) {
        this.goals = (goals != null) ? goals : new ArrayList<>();
    }
}
