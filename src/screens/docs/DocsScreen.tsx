import Markdown from 'react-markdown';
import { useLocation, Link } from 'react-router-dom';
import { useMemo } from 'react';

const docs: Record<string, string> = import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true });

function LinkRenderer({ href, children }: { href?: string, children?: React.ReactNode }) {
    if (href && href.startsWith('./')) {
        return <Link to={`/docs/${href.replace('./', '')}`}>{children}</Link>;
    }
    if (href && href.startsWith('/docs/')) {
        return <Link to={href}>{children}</Link>;
    }
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export function DocsScreen() {
    const location = useLocation();

    const currentDoc = useMemo(() => {
        let path = location.pathname.replace('/docs', '');
        if (path.startsWith('/')) path = path.slice(1);
        if (!path) path = 'index.md';
        
        const key = `../../../docs/${path}`;
        if (typeof docs[key] === "string") {
            return docs[key];
        }
        return `# 404\nDocument not found.`;
    }, [location.pathname]);

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
            <div style={{ maxWidth: "800px", width: "100%", fontSize: "1.1rem", lineHeight: "1.6" }}>
                <Markdown
                    components={{
                        a: LinkRenderer
                    }}
                >
                    {currentDoc}
                </Markdown>
            </div>
        </div>
    );
}
