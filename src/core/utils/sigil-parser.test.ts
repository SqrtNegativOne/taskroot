import { describe, it, expect } from "vitest";
import { parseSigils } from "./sigil-parser";

describe("sigil-parser", () => {
    it("extracts priority", () => {
        expect(parseSigils("hello .").properties.priority).toBe(1);
        expect(parseSigils("hello .").cleanTitle).toBe("hello");

        expect(parseSigils("hello ..").properties.priority).toBe(0);
        expect(parseSigils("hello !").properties.priority).toBe(2);
        expect(parseSigils("hello !!").properties.priority).toBe(3);
        expect(parseSigils("hello !!!").properties.priority).toBe(4);
        expect(parseSigils("hello !!!!!").properties.priority).toBe(4);
        
        expect(parseSigils("hello p0").properties.priority).toBe(0);
        expect(parseSigils("hello p4").properties.priority).toBe(4);
    });

    it("respects word boundaries", () => {
        expect(parseSigils("hello.world").properties.priority).toBeUndefined();
        expect(parseSigils("wow!!").cleanTitle).toBe("wow!!"); // Wait, should it parse "wow!!"? The user said "sigils must be either at the start of the string or preceded by whitespace, and followed by whitespace or end-of-string. That's what stops "get milk!!" (excited, not priority) from misparsing."
        expect(parseSigils("get milk!!").properties.priority).toBeUndefined();
        expect(parseSigils("get milk !!").properties.priority).toBe(3);
        expect(parseSigils("get milk !!").cleanTitle).toBe("get milk");
    });

    it("extracts tags", () => {
        const res = parseSigils("buy milk #groceries #urgent");
        expect(res.properties.tags).toEqual(["groceries", "urgent"]);
        expect(res.cleanTitle).toBe("buy milk");
    });

    it("extracts duration", () => {
        expect(parseSigils("do something 1h").properties.duration).toBe(60);
        expect(parseSigils("do something 1hr").properties.duration).toBe(60);
        expect(parseSigils("do something 7m").properties.duration).toBe(7);
        expect(parseSigils("do something for 8m").properties.duration).toBe(8);
        expect(parseSigils("do something in 1h").properties.duration).toBe(60);
        expect(parseSigils("do something for 1h").cleanTitle).toBe("do something");
    });

    it("extracts day and time", () => {
        let res = parseSigils("meeting mon 4pm");
        expect(res.properties.day).toBe("mon");
        expect(res.properties.time).toBe("4pm");
        expect(res.cleanTitle).toBe("meeting");

        res = parseSigils("meeting tom 4pm");
        expect(res.properties.day).toBe("tom");
        expect(res.properties.time).toBe("4pm");
        
        res = parseSigils("meeting 4pm tom");
        expect(res.properties.day).toBe("tom");
        expect(res.properties.time).toBe("4pm");
    });

    it("handles multiple sigils mixed", () => {
        const res = parseSigils("#tag develop taskroot !! tom fri 5pm in 14m");
        expect(res.properties.tags).toEqual(["tag"]);
        expect(res.properties.priority).toBe(3);
        // "tom" and "fri" might both try to set day, usually last one wins or they combine. Let's say last one wins or we combine. "fri" is a day.
        // Wait, "tom" and "fri" are both day sigils.
        expect(res.properties.time).toBe("5pm");
        expect(res.properties.duration).toBe(14);
    });

    it("preserves tokens for highlighting", () => {
        const res = parseSigils("test !! #tag");
        expect(res.tokens).toEqual([
            { type: "text", text: "test " },
            { type: "sigil", text: "!!" },
            { type: "text", text: " " },
            { type: "sigil", text: "#tag" }
        ]);
    });
});
