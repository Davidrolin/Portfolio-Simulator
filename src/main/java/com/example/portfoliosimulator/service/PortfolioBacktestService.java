package com.example.portfoliosimulator.service;

import com.example.portfoliosimulator.client.StockApiClient;
import com.example.portfoliosimulator.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioBacktestService {

    private final StockApiClient stockApiClient;

    public PortfolioBacktestService(StockApiClient stockApiClient) {
        this.stockApiClient = stockApiClient;
    }

    public BacktestResult runBacktest(PortfolioRequest request) {
        Map<String, Map<String, Double>> assetPriceMaps = new HashMap<>();
        Set<String> commonDates = null;

        for (PortfolioAsset asset : request.getAssets()) {
            List<StockPrice> prices = stockApiClient.getWeeklyPrices(asset.getTicker());

            Map<String, Double> priceMap = prices.stream()
                    .collect(Collectors.toMap(StockPrice::getDate, StockPrice::getClose, (existing, replacement) -> existing));

            assetPriceMaps.put(asset.getTicker(), priceMap);

            if (commonDates == null) {
                commonDates = new TreeSet<>(priceMap.keySet());
            } else {
                commonDates.retainAll(priceMap.keySet());
            }
        }

        List<StockPrice> spyPrices = stockApiClient.getWeeklyPrices("SPY");
        Map<String, Double> spyPriceMap = spyPrices.stream()
                .collect(Collectors.toMap(StockPrice::getDate, StockPrice::getClose, (existing, replacement) -> existing));

        if (commonDates != null) {
            commonDates.retainAll(spyPriceMap.keySet());
        }

        if (commonDates == null || commonDates.isEmpty()) {
            return new BacktestResult(Collections.emptyList(), 0.0, 0.0, 0.0, 0.0, 0.0);
        }

        List<String> sortedDates = new ArrayList<>(commonDates);
        Collections.sort(sortedDates);

        List<BacktestDataPoint> dataPoints = new ArrayList<>();
        Map<String, Double> initialPrices = new HashMap<>();
        double initialSpyPrice = spyPriceMap.get(sortedDates.get(0));

        boolean isFirstPoint = true;
        double peakPortfolioValue = 0.0;

        for (String date : sortedDates) {
            double totalPortfolioValue = 0.0;

            for (PortfolioAsset asset : request.getAssets()) {
                double currentPrice = assetPriceMaps.get(asset.getTicker()).get(date);

                if (isFirstPoint) {
                    initialPrices.put(asset.getTicker(), currentPrice);
                }

                double startPrice = initialPrices.get(asset.getTicker());
                double normalizedPerformance = currentPrice / startPrice;

                double assetContribution = 10000.0 * (asset.getWeight() / 100.0) * normalizedPerformance;
                totalPortfolioValue += assetContribution;
            }

            if (isFirstPoint) {
                peakPortfolioValue = totalPortfolioValue;
            } else {
                if (totalPortfolioValue > peakPortfolioValue) {
                    peakPortfolioValue = totalPortfolioValue;
                }
            }

            double portfolioDrawdown = (totalPortfolioValue - peakPortfolioValue) / peakPortfolioValue;

            double currentSpyPrice = spyPriceMap.get(date);
            double benchmarkValue = 10000.0 * (currentSpyPrice / initialSpyPrice);

            isFirstPoint = false;
            dataPoints.add(new BacktestDataPoint(date, totalPortfolioValue, benchmarkValue, portfolioDrawdown));
        }

        double totalPortfolioReturn = calculateTotalReturn(dataPoints);
        double totalBenchmarkReturn = calculateBenchmarkReturn(dataPoints);
        double volatility = calculateVolatility(dataPoints);
        double sharpeRatio = calculateSharpeRatio(totalPortfolioReturn, volatility);
        double maxDrawdown = calculateMaxDrawdown(dataPoints);

        return new BacktestResult(dataPoints, totalPortfolioReturn, totalBenchmarkReturn, volatility, sharpeRatio, maxDrawdown);
    }

    private double calculateTotalReturn(List<BacktestDataPoint> dataPoints) {
        if (dataPoints.size() < 2) return 0.0;
        double startValue = dataPoints.get(0).getPortfolioValue();
        double endValue = dataPoints.get(dataPoints.size() - 1).getPortfolioValue();
        return (endValue - startValue) / startValue;
    }

    private double calculateBenchmarkReturn(List<BacktestDataPoint> dataPoints) {
        if (dataPoints.size() < 2) return 0.0;
        double startValue = dataPoints.get(0).getBenchmarkValue();
        double endValue = dataPoints.get(dataPoints.size() - 1).getBenchmarkValue();
        return (endValue - startValue) / startValue;
    }

    private double calculateVolatility(List<BacktestDataPoint> dataPoints) {
        if (dataPoints.size() < 3) return 0.0;

        List<Double> weeklyReturns = new ArrayList<>();
        for (int i = 1; i < dataPoints.size(); i++) {
            double prev = dataPoints.get(i - 1).getPortfolioValue();
            double curr = dataPoints.get(i).getPortfolioValue();
            weeklyReturns.add((curr - prev) / prev);
        }

        double mean = weeklyReturns.stream().mapToDouble(v -> v).average().orElse(0.0);
        double variance = weeklyReturns.stream().mapToDouble(v -> Math.pow(v - mean, 2)).sum() / (weeklyReturns.size() - 1);
        double weeklyVolatility = Math.sqrt(variance);

        return weeklyVolatility * Math.sqrt(52);
    }

    private double calculateSharpeRatio(double totalReturn, double volatility) {
        double riskFreeRate = 0.02;
        if (volatility == 0.0) return 0.0;
        return (totalReturn - riskFreeRate) / volatility;
    }

    private double calculateMaxDrawdown(List<BacktestDataPoint> dataPoints) {
        if (dataPoints.isEmpty()) return 0.0;

        double maxDrawdown = 0.0;
        for (BacktestDataPoint point : dataPoints) {
            if (point.getPortfolioDrawdown() < maxDrawdown) {
                maxDrawdown = point.getPortfolioDrawdown();
            }
        }
        return maxDrawdown;
    }
}