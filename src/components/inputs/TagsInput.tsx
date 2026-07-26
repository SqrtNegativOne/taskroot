import React from "react";

export interface TagsInputProps {
    tags: string[];
    allTags: string[];
    onChange: (tags: string[]) => void;
}

export function TagsInput({ tags, allTags, onChange }: TagsInputProps) {
    const [inputValue, setInputValue] = React.useState("");
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
        } else if (
            e.key === "Backspace" &&
            inputValue === "" &&
            tags.length > 0
        ) {
            onChange(tags.slice(0, -1));
        }
    };

    const addTag = (tagStr: string) => {
        const t = tagStr.trim();
        if (t && !tags.includes(t)) {
            onChange([...tags, t]);
        }
        setInputValue("");
    };

    const removeTag = (t: string) => {
        onChange(tags.filter((x) => x !== t));
    };

    const suggestions = allTags.filter(
        (t) =>
            t.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(t),
    );

    return (
        <div className="tags-input-container">
            {tags.map((t: string) => (
                <span key={t} className="tag-chip">
                    {t}{" "}
                    <button type="button" onClick={() => removeTag(t)}>
                        ×
                    </button>
                </span>
            ))}
            <div style={{ position: "relative", flex: 1 }}>
                <input
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                    }
                    placeholder={tags.length === 0 ? "Add tags..." : ""}
                />
                {showSuggestions && inputValue && suggestions.length > 0 && (
                    <div className="tags-suggestions">
                        {suggestions.map((s) => (
                            <button
                                type="button"
                                key={s}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(s);
                                }}
                                className="tag-suggestion"
                                style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
