import DOMPurify from "dompurify";
import { marked } from "marked";
marked.setOptions({
    breaks: true,
    gfm: true,
});
export function renderMarkdown(content) {
    const raw = marked.parse(content);
    return DOMPurify.sanitize(raw);
}
