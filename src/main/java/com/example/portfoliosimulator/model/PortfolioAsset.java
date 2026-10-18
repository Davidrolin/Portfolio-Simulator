package com.example.portfoliosimulator.model;

public class PortfolioAsset {
    private String ticker;
    private double weight;

    public PortfolioAsset() {
    }

    public PortfolioAsset(String ticker, double weight) {
        this.ticker = ticker;
        this.weight = weight;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public double getWeight() {
        return weight;
    }

    public void setWeight(double weight) {
        this.weight = weight;
    }
}
