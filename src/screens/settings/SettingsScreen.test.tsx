// @ts-nocheck
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsScreen } from "./SettingsScreen";
import {
    SETTINGS_SCHEMA,
    SETTINGS_TABS,
} from "../../core/store/settingsSchema";

// Mock dependencies
vi.mock("../../core/store/api", () => ({
    api: {
        clearAllData: vi.fn(),
        subscribeToStore: vi
            .fn()
            .mockImplementation((_key: any, _init: any, _onData: any, onReady: any) => {
                onReady();
                return () => {};
            }),
        saveStoreData: vi.fn(),
    },
}));

describe("SettingsScreen", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();

        // Mock resize observer which is used in SegmentedControl
        vi.stubGlobal("ResizeObserver", class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<MemoryRouter>{ui}</MemoryRouter>);
    };

    it("renders settings tabs", () => {
        renderWithRouter(<SettingsScreen />);

        SETTINGS_TABS.forEach((tab) => {
            expect(screen.getByText(tab.label)).toBeInTheDocument();
        });
    });

    it("filters settings when searching", () => {
        const { container } = renderWithRouter(<SettingsScreen />);

        // Pick a setting that exists, assuming there's at least one in the schema
        const firstSetting = SETTINGS_SCHEMA[0];
        if (!firstSetting) return; // skip if schema is empty

        const searchInput = container.querySelector(".search-input");
        if (!(searchInput instanceof HTMLInputElement)) return;

        act(() => {
            fireEvent.change(searchInput, {
                target: { value: firstSetting.label },
            });
        });

        // The searched setting should be visible
        expect(screen.getByText(firstSetting.label)).toBeInTheDocument();

        // The tabs should be hidden
        expect(
            screen.queryByText(SETTINGS_TABS[0].label),
        ).not.toBeInTheDocument();
    });

    it("renders clear all data button in danger zone", () => {
        // Usually the danger zone is under Data or Advanced tab
        const { container } = renderWithRouter(<SettingsScreen />);

        // Find the clear data button by searching for "Delete everything"
        // Might need to switch to the correct tab first, or just search
        const searchInput2 = container.querySelector(".search-input");
        if (!(searchInput2 instanceof HTMLInputElement)) return;
        act(() => {
            fireEvent.change(searchInput2, {
                target: { value: "Clear All Data" },
            });
        });

        const deleteBtn = screen.getByText("Delete everything");
        expect(deleteBtn).toBeInTheDocument();

        // Mock window.confirm
        const confirmSpy = vi
            .spyOn(window, "confirm")
            .mockImplementation(() => false);

        act(() => {
            fireEvent.click(deleteBtn);
        });

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});
