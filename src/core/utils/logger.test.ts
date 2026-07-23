import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("Logger", () => {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    let mockLogToFile: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        console.log = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();
        mockLogToFile = vi.fn();

        // Mock window.electronAPI
        (global as any).window = {
            electronAPI: {
                logToFile: mockLogToFile,
            },
        };
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        delete (global as any).window;
    });

    it("logs info to console and electronAPI", () => {
        logger.info("Test info message");

        expect(console.log).toHaveBeenCalledWith("[INFO] Test info message");
        expect(mockLogToFile).toHaveBeenCalledWith("info", "Test info message");
    });

    it("logs warn to console and electronAPI", () => {
        logger.warn("Test warn message");

        expect(console.warn).toHaveBeenCalledWith("[WARN] Test warn message");
        expect(mockLogToFile).toHaveBeenCalledWith("warn", "Test warn message");
    });

    it("logs error to console and electronAPI", () => {
        logger.error("Test error message");

        expect(console.error).toHaveBeenCalledWith(
            "[ERROR] Test error message",
        );
        expect(mockLogToFile).toHaveBeenCalledWith(
            "error",
            "Test error message",
        );
    });

    it("works correctly when electronAPI is not available", () => {
        (global as any).window = {};

        expect(() => {
            logger.info("Test info without electron");
        }).not.toThrow();

        expect(console.log).toHaveBeenCalledWith(
            "[INFO] Test info without electron",
        );
    });
});
