/**
 * markdown-it plugin that renders ```scratch code blocks as Scratch 3 SVG images
 * using the scratchblocks library (server-side via jsdom).
 */

import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dom = new JSDOM(
  "<!DOCTYPE html><html><head></head><body></body></html>",
  { pretendToBeVisual: true },
);
const win = dom.window;
global.window = win;
global.document = win.document;
global.SVGElement = win.SVGElement;

const scratchblocksPath = path.resolve(
  __dirname,
  "../node_modules/scratchblocks/build/scratchblocks.min.es.js",
);

const { default: sb } = await import(scratchblocksPath);

export function scratchblocksPlugin(md, options = {}) {
  const defaultFenceRenderer =
    md.renderer.rules.fence ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  md.renderer.rules.fence = function (tokens, idx, opts, env, self) {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : "";

    if (info === "scratch" || info === "scratchblocks") {
      const code = token.content;
      try {
        const style = options.style || "scratch3";
        const languages = options.languages || ["en"];
        const doc = sb.parse(code, { languages });
        const svg = sb.render(doc, { style });
        return svg.outerHTML;
      } catch {
        return `<pre><code class="language-scratch">${md.utils.escapeHtml(code)}</code></pre>`;
      }
    }

    return defaultFenceRenderer(tokens, idx, opts, env, self);
  };
}

export default scratchblocksPlugin;
