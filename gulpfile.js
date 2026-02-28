import { series, parallel, watch, src, dest } from "gulp";
import vfs from "vinyl-fs";
import MarkdownIt from "markdown-it";
import { readFile, writeFile } from "node:fs/promises";
import meta from "markdown-it-meta";
import Handlebars from "handlebars";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import python from "highlight.js/lib/languages/python";
import path from "path";
import { Writable } from "streamx";
import logger from "gulplog";
import markdownItAttrs from "markdown-it-attrs";
import { snippet } from "@mdit/plugin-snippet";
import { icon, fontawesomeRender } from "@mdit/plugin-icon";
import { imgSize } from "@mdit/plugin-img-size";
import { uml } from "@mdit/plugin-uml";
import { mark } from "@mdit/plugin-mark";
import { container } from "@mdit/plugin-container";
import { demo } from "@mdit/plugin-demo";
import { stylize } from "@mdit/plugin-stylize";
import { include } from "@mdit/plugin-include";
import { katex } from "@mdit/plugin-katex";
import fs from "fs";
import { tab } from "@mdit/plugin-tab";
import { scratchblocksPlugin } from "./lib/scratch-plugin.js";

const templateDir = import.meta.dirname + "/templates";
let assignmentMap = [];

hljs.registerLanguage("c", cpp);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("ino", cpp);
hljs.registerLanguage("py", python);

const md = MarkdownIt({
  html: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: false })
          .value;
      } catch (__) {}
    }

    return "";
  },
});
md.use(snippet, {
  currentPath: (env) => env.currentMdFilePath,
  resolvePath: (filePath, currentPath) => {
    const pathParts = filePath.split(path.sep);
    if (pathParts[0].indexOf("global-") === 0) {
      return path.resolve(import.meta.dirname, filePath);
    } else {
      return path.resolve(currentPath, filePath);
    }
  },
});
md.use(include, {
  currentPath: (env) => env.currentMdFilePath,
  resolvePath: (filePath, currentPath) => {
    const pathParts = filePath.split(path.sep);
    if (pathParts[0].indexOf("global-") === 0) {
      return path.resolve(import.meta.dirname, filePath);
    } else {
      return path.resolve(currentPath, filePath);
    }
  },
  deep: true,
});
md.use(meta);
md.use(katex);
md.use(imgSize);
md.use(markdownItAttrs);
md.use(icon, {
  render: fontawesomeRender,
});
md.use(mark);
const containerCloseRender = (tokens, index, options, _env, slf) =>
  '<div class="clear-float"></div></div>';

md.use(container, {
  name: "challenge",
  closeRender: containerCloseRender,
});
md.use(container, {
  name: "codeblock",
  closeRender: containerCloseRender,
});
md.use(container, {
  name: "read",
  closeRender: containerCloseRender,
});
md.use(container, {
  name: "build",
  closeRender: containerCloseRender,
});
md.use(container, {
  name: "program",
  closeRender: containerCloseRender,
});
md.use(demo, {
  showCodeFirst: true,
});
md.use(stylize, {
  config: [
    {
      matcher: "pagebreak",
      replacer: ({ tag }) => {
        if (tag === "em")
          return {
            tag: "div",
            attrs: { class: "pagebreak" },
            content: "",
          };
      },
    },
    {
      matcher: "clear-float",
      replacer: ({ tag }) => {
        if (tag === "em")
          return {
            tag: "div",
            attrs: { class: "clear-float" },
            content: "",
          };
      },
    },
  ],
});
md.use(tab, {
  name: "tabs",
});
md.use(scratchblocksPlugin);

const ruleProxy = (tokens, idx, options, env, self) =>
  self.renderToken(tokens, idx, options);

const defaultHrRenderer = md.renderer.hr || ruleProxy;

md.renderer.rules.hr = function (tokens, idx, options, env, self) {
  if (tokens[idx].markup[0] === "-") {
    tokens[idx].attrJoin("class", "separator-thin");
  } else if (tokens[idx].markup[0] === "_") {
    tokens[idx].attrJoin("class", "separator-hidden");
  } else if (tokens[idx].markup[0] === "*") {
    tokens[idx].attrJoin("class", "separator-fat");
  }

  return defaultHrRenderer(tokens, idx, options, env, self);
};

const defaultLinkRenderer = md.renderer.image || ruleProxy;

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  env.usedAssets.push({
    src: tokens[idx].attrGet("src"),
    includedPaths: [...(env.includedPaths || [])],
  });

  return defaultLinkRenderer(tokens, idx, options, env, self);
};

Handlebars.registerHelper(
  "renderMarkdown",
  function (object, propertyName, defaultValue, options) {
    return md.render(object.toString());
  },
);

Handlebars.registerHelper(
  "includes",
  function (str, substring) {
    return str && str.includes(substring);
  },
);

function generateAssignment() {
  const writable = new Writable({
    async write(data, cb) {
      try {
        logger.info("compiling " + data.path);

        const pathInfo = path.parse(data.path);
        const pathInWorkspace = path
          .relative(process.cwd(), data.path)
          .split(path.sep);
        const targetDir = path.join(
          process.cwd(),
          "docs",
          ...pathInWorkspace.slice(1, -1),
        );
        const relativeTargetPath = path.join(...pathInWorkspace.slice(1, -1));

        const env = {
          usedAssets: [],
          currentMdFilePath: data.path,
        };
        md.meta = {};
        const result = md.render(data.contents.toString(), env);

        const templateName = md.meta.template || "default";
        const template = await readFile(
          `${templateDir}/template-${templateName}.hbs`,
          {
            encoding: "utf8",
          },
        );
        const compiledTemplate = Handlebars.compile(template);

        const output = compiledTemplate({
          content: result,
          meta: md.meta,
          templateAssetFolder: path
            .join(
              path.relative(targetDir, path.join(process.cwd(), "docs")),
              "template-assets",
            )
            .split(path.sep)
            .join("/"),
        });

        // Generate the assignment HTML file
        await fs.promises.mkdir(targetDir, { recursive: true });
        const targetPath = path.join(targetDir, pathInfo.name + ".html");
        await writeFile(targetPath, output);

        const relativeTargetPathForMap = path.join(
          relativeTargetPath,
          pathInfo.name + ".html",
        );
        assignmentMap.push({
          path: relativeTargetPathForMap.split(path.sep).join("/"),
          meta: { ...md.meta },
        });

        // Copy used assets to the target directory
        for (const asset of env.usedAssets) {
          const assetSourcePath = path.resolve(
            path.dirname(data.path),
            asset.src,
          );
          const assetTargetPath = path.join(
            targetDir,
            ...path
              .relative(data.path, assetSourcePath)
              .split(path.sep)
              .slice(1),
          );

          const targetDirForAsset = path.dirname(assetTargetPath);

          await fs.promises.mkdir(targetDirForAsset, { recursive: true });

          if (fs.existsSync(assetSourcePath)) {
            await fs.promises.copyFile(assetSourcePath, assetTargetPath);
          } else {
            for (const includedPath of asset.includedPaths) {
              const possiblePath = path.resolve(includedPath, asset.src);
              if (fs.existsSync(possiblePath)) {
                await fs.promises.copyFile(possiblePath, assetTargetPath);
                continue;
              }
            }
          }
        }

        cb(null, output);
      } catch (e) {
        logger.error(e);
      }
    },
  });

  return writable;
}

function buildAssignments(cb) {
  assignmentMap = [];
  const buildAssignmentsTask = vfs
    .src(["opdrachten/**/*.md"])
    .pipe(generateAssignment());

  buildAssignmentsTask.on("finish", () => {
    cb();
  });
}

async function copyIndexHtml(cb) {
  const template = await readFile(`${templateDir}/index-template.hbs`, {
    encoding: "utf8",
  });

  const compiledTemplate = Handlebars.compile(template);

  const output = compiledTemplate({
    assignments: assignmentMap,
  });

  await writeFile(path.join(process.cwd(), "docs", "index.html"), output);

  cb();
}

function copyTemplateAssets(cb) {
  const buildAssignmentsTask = src(
    [path.join(templateDir, "template-assets", "**/*")],
    { encoding: false },
  ).pipe(dest("docs/template-assets"));

  buildAssignmentsTask.on("finish", () => {
    cb();
  });
}

function watchTask(cb) {
  watch(["opdrachten/**/*", "templates/**/*", "global-lib/**/*"], build);
}

export const build = series(
  buildAssignments,
  copyTemplateAssets,
  copyIndexHtml,
);

export const server = series(build, watchTask);
