package com.example.portfoliosimulator.model;

import java.util.List;

public class PortfolioRequest {
    private List<PortfolioAsset> assets;
    private String startDate; // Format: "YYYY-MM-DD"

    public PortfolioRequest() {
    }

    public PortfolioRequest(List<PortfolioAsset> assets, String startDate) {
        this.assets = assets;
        this.startDate = startDate;
    }

    public List<PortfolioAsset> getAssets() {
        return assets;
    }

    public void setAssets(List<PortfolioAsset> assets) {
        this.assets = assets;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }
}