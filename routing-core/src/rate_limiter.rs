//! Rate Limiter WASM Module
//! Token bucket algorithm optimized for high throughput
//! Designed to replace Node.js middleware

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct RateLimiter {
    capacity: u32,
    tokens: f64,
    refill_rate: f64,
    last_refill: u64,
}

#[wasm_bindgen]
impl RateLimiter {
    #[wasm_bindgen(constructor)]
    pub fn new(capacity: u32, refill_rate: f64) -> RateLimiter {
        RateLimiter {
            capacity,
            tokens: capacity as f64,
            refill_rate,
            last_refill: current_time_ms(),
        }
    }

    /// Check if request is allowed and consume token if yes
    /// Returns: (allowed: bool, remaining_tokens: u32)
    #[wasm_bindgen]
    pub fn allow_request(&mut self) -> u32 {
        let now = current_time_ms();
        let time_passed_ms = now - self.last_refill;
        let time_passed_s = time_passed_ms as f64 / 1000.0;

        // Refill tokens based on time passed
        self.tokens = f64::min(
            self.capacity as f64,
            self.tokens + (time_passed_s * self.refill_rate),
        );
        self.last_refill = now;

        // Consume token if available
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            (self.tokens.floor() as u32) | 0x80000000 // Set MSB to indicate allowed
        } else {
            self.tokens.floor() as u32 // Denied
        }
    }

    /// Get remaining tokens without consuming
    #[wasm_bindgen]
    pub fn get_remaining(&mut self) -> u32 {
        let now = current_time_ms();
        let time_passed_ms = now - self.last_refill;
        let time_passed_s = time_passed_ms as f64 / 1000.0;

        let projected = f64::min(
            self.capacity as f64,
            self.tokens + (time_passed_s * self.refill_rate),
        );
        projected.floor() as u32
    }

    /// Reset to full capacity
    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.tokens = self.capacity as f64;
        self.last_refill = current_time_ms();
    }
}

// Helper to get current time in milliseconds
// Note: In WASM, this must be called from JS context
fn current_time_ms() -> u64 {
    (js_sys::Date::now() as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_bucket_creation() {
        let limiter = RateLimiter::new(100, 100.0 / 60.0);
        assert_eq!(limiter.capacity, 100);
    }

    #[test]
    fn test_allows_requests_within_capacity() {
        let mut limiter = RateLimiter::new(5, 5.0);
        
        // Should allow first 5
        for _ in 0..5 {
            let result = limiter.allow_request();
            assert!(result & 0x80000000 != 0, "Request should be allowed");
        }
    }

    #[test]
    fn test_blocks_when_exhausted() {
        let mut limiter = RateLimiter::new(1, 0.0); // No refill
        
        // First should succeed
        let result = limiter.allow_request();
        assert!(result & 0x80000000 != 0, "First request should be allowed");
        
        // Second should fail
        let result = limiter.allow_request();
        assert!(result & 0x80000000 == 0, "Second request should be blocked");
    }

    #[test]
    fn test_reset() {
        let mut limiter = RateLimiter::new(10, 0.0);
        
        // Exhaust
        for _ in 0..10 {
            limiter.allow_request();
        }
        
        // Reset
        limiter.reset();
        let result = limiter.allow_request();
        assert!(result & 0x80000000 != 0, "Should allow after reset");
    }
}
