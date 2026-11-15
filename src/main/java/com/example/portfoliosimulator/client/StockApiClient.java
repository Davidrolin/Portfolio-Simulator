package com.example.portfoliosimulator.client;

import com.example.portfoliosimulator.model.StockPrice;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Component
public class StockApiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${alphavantage.api.key}")
    private String apiKey;

    public StockApiClient() {
        this.restClient = RestClient.builder()
                .baseUrl("https://www.alphavantage.co")
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public List<StockPrice> getWeeklyPrices(String ticker) {
        try {
            Thread.sleep(1500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        String url = String.format("/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=%s&apikey=%s", ticker, apiKey);

        String responseBody = restClient.get()
                .uri(url)
                .retrieve()
                .body(String.class);

        List<StockPrice> prices = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode timeSeries = root.get("Weekly Adjusted Time Series");

            if (timeSeries != null) {
                timeSeries.fields().forEachRemaining(entry -> {
                    String date = entry.getKey();
                    double closePrice = entry.getValue().get("5. adjusted close").asDouble();
                    prices.add(new StockPrice(date, closePrice));
                });
            }
        } catch (Exception e) {
            throw new RuntimeException("Kunde inte parsa prisdata för " + ticker, e);
        }

        return prices;
    }
}
