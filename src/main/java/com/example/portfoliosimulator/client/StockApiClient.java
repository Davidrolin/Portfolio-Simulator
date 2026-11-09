package com.example.portfoliosimulator.client;

import com.example.portfoliosimulator.model.StockPrice;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.*;

@Component
public class StockApiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${alphavantage.api.key}")
    private String apiKey;

    public StockApiClient(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.restClient = restClientBuilder.baseUrl("https://www.alphavantage.co").build();
        this.objectMapper = objectMapper;
    }

    public List<StockPrice> getWeeklyPrices(String ticker) {
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
                Iterator<Map.Entry<String, JsonNode>> fields = timeSeries.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    String date = entry.getKey();
                    double closePrice = entry.getValue().get("5. adjusted close").asDouble();

                    prices.add(new StockPrice(date, closePrice));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Kunde inte parsa prisdata för " + ticker, e);
        }

        return prices;
    }
}
