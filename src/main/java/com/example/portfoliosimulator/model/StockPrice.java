package com.example.portfoliosimulator.model;

public class StockPrice {

    private String date;
    private double close;

    public StockPrice() {
    }

    public StockPrice(String date, double close) {
        this.date = date;
        this.close = close;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public double getClose() {
        return close;
    }

    public void setClose(double close) {
        this.close = close;
    }
}
