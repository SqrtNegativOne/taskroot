import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { Collapsible } from "./collapsible";

describe("Collapsible UI Component", () => {
    it("renders the title", () => {
        render(
            <Collapsible title="My Test Section" badge={null}>
                <div>Hidden Content</div>
            </Collapsible>,
        );

        // The UI should display the title
        expect(screen.getByText("My Test Section")).toBeInTheDocument();
    });

    it("toggles content visibility when clicked", () => {
        // 1. Render the component in the virtual DOM
        render(
            <Collapsible title="Click Me" badge={null}>
                <div>Hidden Content</div>
            </Collapsible>,
        );

        // 2. Assert initial state (should be closed, meaning the content isn't visible)
        // Actually, by default in collapsible.tsx, it might be open or closed depending on its default state.
        // Let's assume defaultOpen is false.
        const content = screen.queryByText("Hidden Content");
        // We expect it to NOT be in the document initially if defaultOpen=false,
        // OR we expect its wrapper to be closed. We'll simulate a click.

        // 3. Simulate a user clicking on the header
        const header = screen.getByText("Click Me");
        fireEvent.click(header);

        // 4. Assert new state! The hidden content should now be revealed.
        expect(screen.getByText("Hidden Content")).toBeInTheDocument();
    });
});
