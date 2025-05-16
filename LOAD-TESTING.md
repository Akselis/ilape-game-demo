# Load Testing Guide for iLape Web Game

This guide explains how to perform load testing on your Phaser.js web game application.

## Prerequisites

- Node.js installed
- Application running on port 3000 (`npm start`)

## Available Load Testing Scripts

We've set up two main load testing commands:

1. **Basic Load Test**: 
   ```
   npm run load-test
   ```
   This runs a complete load test scenario with increasing load over time.

2. **Load Test with Report**:
   ```
   npm run load-test:report
   ```
   This runs the same load test but generates a detailed HTML report.

## Load Test Configuration

The load test is configured in `load-test.yml` and consists of three phases:

1. **Warm-up Phase**: 5 virtual users for 60 seconds
2. **Ramp-up Phase**: Gradually increases from 10 to 50 users over 120 seconds
3. **Sustained Load**: 50 concurrent users for 300 seconds (5 minutes)

## Custom Test Functions

Custom test functions are defined in `custom-load-test.js` and simulate:
- Player interactions with the game
- Asset loading behavior

## Interpreting Results

After running a load test, pay attention to:

1. **Response Time**: Should stay under 200ms for good user experience
2. **Error Rate**: Should be near zero
3. **Throughput**: Requests per second your server can handle
4. **Concurrent Users**: Maximum number of simultaneous players

## Monitoring During Tests

While tests are running, monitor:
- CPU and memory usage
- Network traffic
- Server logs for errors

## Optimizing Based on Results

If you identify bottlenecks:
1. Check server-side code for inefficiencies
2. Optimize asset loading (compression, CDN)
3. Consider caching frequently accessed resources
4. Review database queries if applicable
5. Consider scaling your server resources if needed
