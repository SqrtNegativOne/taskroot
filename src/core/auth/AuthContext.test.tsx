
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("./googleAuthUtils", () => ({
    loadGoogleIdentityScript: vi.fn<(...args: never[]) => unknown>().mockResolvedValue(undefined),
    requestGoogleAuthCode: vi.fn<(...args: never[]) => unknown>().mockResolvedValue("test-code"),
    exchangeAuthCodeForTokens: vi.fn<(...args: never[]) => unknown>().mockResolvedValue({ accessToken: "test-token", refreshToken: "test-refresh" }),
}));

vi.mock("../utils/notifications", () => ({
    useNotification: () => ({
        notify: () => {},
    }),
}));

const TestComponent = () => {
    const { user, loading, loginWithGoogle, logout } = useAuth();

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div data-testid="user-status">
                {user ? `Logged in as ${user.uid}` : "Not logged in"}
            </div>
            <button onClick={loginWithGoogle}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe("AuthContext", () => {
    beforeEach(() => {
        localStorage.clear();
        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { reload: vi.fn<(...args: never[]) => unknown>() }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("initially shows not logged in when no tokens exist", () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });

    it("shows logged in when token exists", () => {
        localStorage.setItem("google_access_token", "fake-token");
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        expect(screen.getByTestId("user-status")).toHaveTextContent("Logged in as local-user");
    });

    it("logs in and reloads", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        await act(async () => {
            screen.getByText("Login").click();
        });

        expect(localStorage.getItem("google_access_token")).toBe("test-token");
        expect(window.location.reload).toHaveBeenCalled();
    });

    it("logs out and reloads", async () => {
        localStorage.setItem("google_access_token", "fake-token");
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        await act(async () => {
            screen.getByText("Logout").click();
        });

        expect(localStorage.getItem("google_access_token")).toBeNull();
        expect(window.location.reload).toHaveBeenCalled();
    });
});
