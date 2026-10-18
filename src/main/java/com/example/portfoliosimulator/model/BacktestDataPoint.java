package com.example.portfoliosimulator.model;

public class BacktestDataPoint {
    private String date;
    private double portfolioValue;   // Indexerat till start 100
    private double benchmarkValue;   // SPY indexerat till start 100
    private double portfolioDrawdown; // Procentuell drawdown från topp (negativt värde)

    public BacktestDataPoint() {
    }

    public BacktestDataPoint(String date, double portfolioValue, double benchmarkValue, double portfolioDrawdown) {
        this.date = date;
        this.portfolioValue = portfolioValue;
        this.benchmarkValue = benchmarkValue;
        this.portfolioDrawdown = portfolioDrawdown;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public double getPortfolioValue() {
        return portfolioValue;
    }

    public void setPortfolioValue(double portfolioValue) {
        this.portfolioValue = portfolioValue;
    }

    public double getBenchmarkValue() {
        return benchmarkValue;
    }

    public void setBenchmarkValue(double benchmarkValue) {
        this.benchmarkValue = benchmarkValue;
    }

    public double getPortfolioDrawdown() {
        return portfolioDrawdown;
    }

    public void setPortfolioDrawdown(double portfolioDrawdown) {
        this.portfolioDrawdown = portfolioDrawdown;
    }
}