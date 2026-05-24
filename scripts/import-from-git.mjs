import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, posix, join } from "node:path";

const sourceRepo = process.argv[2] ?? "../maths-cs-ai-compendium";
const docsDir = "docs";

const ignoredPrefixes = [".github/", "mcp/"];
const ignoredFiles = new Set([".gitignore", "mkdocs.yml"]);

const sanitizePath = (path) =>
  path
    .split("/")
    .map((part) =>
      part
        .replaceAll(":", " -")
        .replace(/[<>"|?*]/g, "-")
        .replace(/[ .]+$/g, ""),
    )
    .join("/");

const originalToDocsPath = (path) => {
  if (path === "README.md") return "index.md";
  return sanitizePath(path);
};

const docsPathForOriginal = (path) => originalToDocsPath(path);

const repoFiles = execFileSync("git", [
  "-C",
  sourceRepo,
  "ls-tree",
  "-r",
  "--name-only",
  "HEAD",
], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

rmSync(docsDir, { recursive: true, force: true });
mkdirSync(docsDir, { recursive: true });

for (const sourcePath of repoFiles) {
  if (ignoredFiles.has(sourcePath)) continue;
  if (ignoredPrefixes.some((prefix) => sourcePath.startsWith(prefix))) continue;

  const targetRelative = docsPathForOriginal(sourcePath);
  const targetPath = join(docsDir, ...targetRelative.split("/"));
  mkdirSync(dirname(targetPath), { recursive: true });

  const blob = execFileSync("git", ["-C", sourceRepo, "show", `HEAD:${sourcePath}`], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(targetPath, blob);
}

const pathMap = new Map(repoFiles.map((path) => [path, docsPathForOriginal(path)]));

const rewriteLinkTarget = (target, currentPath) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return target;

  const [pathAndQuery, hash = ""] = target.split("#", 2);
  const [rawPath, query = ""] = pathAndQuery.split("?", 2);
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return target;
  }

  const currentDir = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  const normalized = posix.normalize(posix.join(currentDir, decoded));

  const mapped = pathMap.get(normalized);
  if (!mapped) return target;

  const fromDir = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  const fromParts = fromDir ? fromDir.split("/") : [];
  const toParts = mapped.split("/");

  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }

  const relative = [...fromParts.map(() => ".."), ...toParts].join("/") || ".";
  return `${encodeURI(relative)}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
};

const rewriteMarkdown = (content, currentPath) =>
  content
    .replace(/(\[[^\]]*]\()([^)]+)(\))/g, (_, prefix, target, suffix) =>
      `${prefix}${rewriteLinkTarget(target.trim(), currentPath)}${suffix}`,
    )
    .replace(/(<(?:img|a)\b[^>]*(?:src|href)=["'])([^"']+)(["'][^>]*>)/gi, (_, prefix, target, suffix) =>
      `${prefix}${rewriteLinkTarget(target.trim(), currentPath)}${suffix}`,
    );

const escapeReferenceLikeExamples = (content) => {
  let inFence = false;

  return content
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      const segments = line.split(/(`[^`]*`|\$[^$]*\$)/g);
      return segments
        .map((segment, index) => {
          if (index % 2 === 1) return segment;
          return segment.replace(/(?<!!)\[([^\]\n]+)\](?!\()/g, (match, label, offset, source) => {
            if (offset > 0 && source[offset - 1] === "\\") return match;
            const after = source[offset + match.length];
            if (after === "[" || after === ":") return match;
            return `\\[${label}\\]`;
          });
        })
        .join("");
    })
    .join("\n");
};

for (const [sourcePath, targetPath] of pathMap) {
  if (!targetPath.endsWith(".md") && !targetPath.endsWith(".txt")) continue;
  const fullPath = join(docsDir, ...targetPath.split("/"));
  const markdown = readFileSync(fullPath, "utf8");
  const rewritten = rewriteMarkdown(markdown, targetPath);
  writeFileSync(
    fullPath,
    targetPath.endsWith(".md") ? escapeReferenceLikeExamples(rewritten) : rewritten,
    "utf8",
  );
}

const navSource = execFileSync("git", ["-C", sourceRepo, "show", "HEAD:mkdocs.yml"], {
  encoding: "utf8",
});
const navBlock = navSource.slice(navSource.indexOf("\nnav:\n") + 1);
const convertedNav = navBlock.replace(/"([^"]+)"/g, (match, path) => {
  const mapped = pathMap.get(path);
  return mapped ? `"${mapped}"` : match;
});

const quoteToml = (value) => JSON.stringify(value);

const navLines = navBlock.split(/\r?\n/).slice(1);
const navItems = [];
let currentSection = null;

const parseNavEntry = (line) => {
  const match = line.match(/^(\s*)-\s+([^:]+):\s*(.*)$/);
  if (!match) return null;
  const [, indent, rawTitle, rawTarget] = match;
  const title = rawTitle.trim();
  let target = rawTarget.trim();
  if (target.startsWith('"') && target.endsWith('"')) {
    target = target.slice(1, -1);
  }
  return { depth: indent.length, title, target };
};

for (const line of navLines) {
  const entry = parseNavEntry(line);
  if (!entry) continue;

  if (entry.depth === 2) {
    if (entry.target) {
      const mapped = pathMap.get(entry.target) ?? entry.target;
      navItems.push(`  { ${quoteToml(entry.title)} = ${quoteToml(mapped)} }`);
      currentSection = null;
    } else {
      currentSection = { title: entry.title, children: [] };
      navItems.push(currentSection);
    }
    continue;
  }

  if (entry.depth === 4 && currentSection) {
    const mapped = pathMap.get(entry.target) ?? entry.target;
    currentSection.children.push(`    { ${quoteToml(entry.title)} = ${quoteToml(mapped)} }`);
  }
}

const navToml = navItems
  .map((item) => {
    if (typeof item === "string") return item;
    return [
      `  { ${quoteToml(item.title)} = [`,
      item.children.join(",\n"),
      "  ] }",
    ].join("\n");
  })
  .join(",\n");

const zensicalToml = `# Generated from HenryNdubuaku/maths-cs-ai-compendium.
[project]
site_name = "Maths, CS & AI Compendium"
site_url = "https://henryndubuaku.github.io/maths-cs-ai-compendium/"
site_description = "An open, intuition-first textbook covering mathematics, computer science, and artificial intelligence from the ground up."
site_author = "Henry Ndubuaku"
docs_dir = "docs"
site_dir = "site"
dev_addr = "localhost:8000"
use_directory_urls = true
extra_javascript = [
  "javascripts/mathjax.js",
  "https://unpkg.com/mathjax@3/es5/tex-mml-chtml.js",
]
nav = [
${navToml}
]

[project.markdown_extensions.admonition]
[project.markdown_extensions.attr_list]
[project.markdown_extensions.md_in_html]
[project.markdown_extensions.tables]
[project.markdown_extensions.toc]
permalink = true
[project.markdown_extensions.pymdownx.arithmatex]
generic = true
[project.markdown_extensions.pymdownx.highlight]
anchor_linenums = true
[project.markdown_extensions.pymdownx.superfences]
custom_fences = [
  { name = "math", class = "arithmatex", format = "pymdownx.arithmatex.arithmatex_fenced_format" },
]
[project.markdown_extensions.pymdownx.tabbed]
alternate_style = true

`;

writeFileSync("zensical.toml", zensicalToml, "utf8");

const mkdocsYml = navSource
  .replace(/^docs_dir: \.$/m, "docs_dir: docs")
  .replace(/"([^"]+)"/g, (match, path) => {
    const mapped = pathMap.get(path);
    return mapped ? `"${mapped}"` : match;
  });
writeFileSync("mkdocs.yml", mkdocsYml, "utf8");
writeFileSync("navigation.generated.yml", convertedNav, "utf8");
