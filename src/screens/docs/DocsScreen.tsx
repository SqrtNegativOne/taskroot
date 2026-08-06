import Markdown from 'react-markdown';
import indexDocContent from '../../../docs/index.md?raw';

export function DocsScreen() {
    return (
        <div
            className="main"
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "2rem",
                overflowY: "auto",
                color: "var(--fg)",
            }}
        >
            <div style={{ maxWidth: "800px", width: "100%" }}>
                <Markdown>{indexDocContent}</Markdown>
            </div>
        </div>
    );
}
