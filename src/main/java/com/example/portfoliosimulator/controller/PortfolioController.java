package com.example.portfoliosimulator.controller;

import com.example.portfoliosimulator.model.BacktestResult;
import com.example.portfoliosimulator.model.PortfolioRequest;
import com.example.portfoliosimulator.service.PortfolioBacktestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/backtest")
@CrossOrigin(origins = "http://localhost:5173")
public class PortfolioController {

    private final PortfolioBacktestService backtestService;

    public PortfolioController(PortfolioBacktestService backtestService) {
        this.backtestService = backtestService;
    }

    @PostMapping
    public ResponseEntity<BacktestResult> runBacktest(@RequestBody PortfolioRequest request) {
        if (request == null || request.getAssets() == null || request.getAssets().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        BacktestResult result = backtestService.runBacktest(request);
        return ResponseEntity.ok(result);
    }
}
