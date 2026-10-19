package com.example.portfoliosimulator.model;

import java.util.List;

public class BacktestResult {
    private List<BacktestDataPoint> series;
    private double totalPortfolioReturn;
    private double totalBenchmarkReturn;
    private double portfolioVolatility;
    private double sharpeRatio;
    private double maxDrawdown;

    public BacktestResult() {
    }

    public BacktestResult(List<BacktestDataPoint> series, double totalPortfolioReturn, double totalBenchmarkReturn, double portfolioVolatility, double sharpeRatio, double maxDrawdown) {
        this.series = series;
        this.totalPortfolioReturn = totalPortfolioReturn;
        this.totalBenchmarkReturn = totalBenchmarkReturn;
        this.portfolioVolatility = portfolioVolatility;
        this.sharpeRatio = sharpeRatio;
        this.maxDrawdown = maxDrawdown;
    }

    public List<BacktestDataPoint> getSeries() {
        return series;
    }

    public void setSeries(List<BacktestDataPoint> series) {
        this.series = series;
    }

    public double getTotalPortfolioReturn() {
        return totalPortfolioReturn;
    }

    public void setTotalPortfolioReturn(double totalPortfolioReturn) {
        this.totalPortfolioReturn = totalPortfolioReturn;
    }

    public double getTotalBenchmarkReturn() {
        return totalBenchmarkReturn;
    }

    public void setTotalBenchmarkReturn(double totalBenchmarkReturn) {
        this.totalBenchmarkReturn = totalBenchmarkReturn;
    }

    public double getPortfolioVolatility() {
        return portfolioVolatility;
    }

    public void setPortfolioVolatility(double portfolioVolatility) {
        this.portfolioVolatility = portfolioVolatility;
    }

    public double getSharpeRatio() {
        return sharpeRatio;
    }

    public void setSharpeRatio(double sharpeRatio) {
        this.sharpeRatio = sharpeRatio;
    }

    public double getMaxDrawdown() {
        return maxDrawdown;
    }

    public void setMaxDrawdown(double maxDrawdown) {
        this.maxDrawdown = maxDrawdown;
    }
}