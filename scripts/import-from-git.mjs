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

const customHomepageLead = String.raw`<section class="compendium-hero" markdown>
<div markdown>

# Maths, CS & AI Compendium

An intuition-first map through mathematics, computer science, and artificial intelligence. Start with vectors and calculus, then keep moving into machine learning, systems, inference, robotics, and the edge of applied AI.
{ .lead }

<div class="hero-actions" markdown>

[Start With Vectors](chapter%2001%20-%20vectors/01.%20vector%20spaces.md){ .md-button .md-button--primary }
[Browse The Map](#learning-map){ .md-button }
[Original GitHub](https://github.com/HenryNdubuaku/maths-cs-ai-compendium){ .md-button }

</div>
</div>

<aside class="hero-panel" markdown>

<img src="images/logo.png" alt="Maths, CS and AI Compendium logo">

<div class="hero-stat-grid">
  <div class="hero-stat"><strong>20</strong><span>chapters</span></div>
  <div class="hero-stat"><strong>100+</strong><span>lessons</span></div>
  <div class="hero-stat"><strong>260+</strong><span>diagrams</span></div>
</div>

</aside>
</section>

<div class="home-strip">
  <a href="chapter%2001%20-%20vectors/01.%20vector%20spaces.md"><strong>Mathematical Core</strong><span>Vectors, matrices, calculus, statistics, probability.</span></a>
  <a href="chapter%2006%20-%20machine%20learning/01.%20classical%20machine%20learning.md"><strong>AI Foundations</strong><span>Classical ML, deep learning, reinforcement learning, NLP, vision.</span></a>
  <a href="chapter%2015%20-%20production%20software%20engineering/01.%20linux%20and%20CMD.md"><strong>Systems Practice</strong><span>Software engineering, GPU programming, inference, cloud systems.</span></a>
  <a href="chapter%2019%20-%20applied%20AI/01.%20AI%20for%20finance.md"><strong>Applied Frontier</strong><span>Finance, healthcare, proteins, agents, quantum and neuromorphic AI.</span></a>
</div>
`;

const learningMap = String.raw`## Learning Map

<div class="grid cards home-pathways" markdown>

- __Maths spine__  
  [Vectors](chapter%2001%20-%20vectors/01.%20vector%20spaces.md), [Matrices](chapter%2002%20-%20matrices/01.%20matrix%20properties.md), [Calculus](chapter%2003%20-%20calculus/01.%20differential%20calculus.md), [Statistics](chapter%2004%20-%20statistics/01.%20fundamentals.md), and [Probability](chapter%2005%20-%20probability/01.%20counting.md).

- __Model building__  
  [Machine Learning](chapter%2006%20-%20machine%20learning/01.%20classical%20machine%20learning.md), [Computational Linguistics](chapter%2007%20-%20computational%20linguistics/01.%20linguistic%20foundations.md), [Computer Vision](chapter%2008%20-%20computer%20vision/01.%20image%20fundamentals.md), and [Audio & Speech](chapter%2009%20-%20audio%20and%20speech/01.%20digital%20signal%20processing.md).

- __Modern architectures__  
  [Multimodal Learning](chapter%2010%20-%20multimodal%20learning/01.%20multimodal%20representations.md), [Autonomous Systems](chapter%2011%20-%20autonomous%20systems/01.%20perception.md), and [Graph Neural Networks](chapter%2012%20-%20graph%20neural%20networks/01.%20geometric%20deep%20learning.md).

- __Production systems__  
  [Computing & OS](chapter%2013%20-%20computing%20and%20OS/01.%20discrete%20maths.md), [Data Structures & Algorithms](chapter%2014%20-%20data%20structures%20and%20algorithms/00.%20foundations.md), [Software Engineering](chapter%2015%20-%20production%20software%20engineering/01.%20linux%20and%20CMD.md), [GPU Programming](chapter%2016%20-%20SIMD%20and%20GPU%20programming/00.%20why%20C++%20and%20how%20ML%20frameworks%20work.md), [AI Inference](chapter%2017%20-%20AI%20inference/01.%20quantisation.md), and [ML Systems Design](chapter%2018%20-%20ML%20systems%20design/01.%20systems%20design%20fundamentals.md).

</div>

## Full Outline

<div class="chapter-table" markdown>
`;

const customStyles = String.raw`:root > * {
  --md-primary-fg-color: #0f766e;
  --md-primary-fg-color--light: #14b8a6;
  --md-primary-fg-color--dark: #115e59;
  --md-accent-fg-color: #d97706;
  --md-default-fg-color: #15211f;
  --md-default-fg-color--light: #53615e;
  --md-default-bg-color: #f7fbfa;
  --md-code-bg-color: #eef5f3;
  --md-code-fg-color: #173733;
  --compendium-border: #d7e6e2;
  --compendium-surface: #ffffff;
  --compendium-surface-muted: #edf7f5;
  --compendium-amber: #f59e0b;
  --compendium-rose: #be123c;
  --compendium-shadow: 0 12px 32px rgba(21, 33, 31, 0.08);
}

[data-md-color-primary="custom"] {
  --md-primary-fg-color: #0f766e;
  --md-primary-fg-color--light: #14b8a6;
  --md-primary-fg-color--dark: #115e59;
}

[data-md-color-accent="custom"] {
  --md-accent-fg-color: #d97706;
}

.md-grid {
  max-width: 1500px;
}

.md-header {
  background: linear-gradient(90deg, #2dd4bf 0%, #38bdf8 58%, #fbbf24 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.24), 0 10px 24px rgba(14, 116, 144, 0.10);
  color: #083344;
}

.md-tabs {
  background: linear-gradient(90deg, #ccfbf1 0%, #e0f2fe 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  color: #164e63;
}

.md-tabs .md-tabs__link {
  color: inherit;
  opacity: 0.74;
}

.md-tabs .md-tabs__link--active,
.md-tabs .md-tabs__link:hover {
  color: #0f766e;
  opacity: 1;
}

.md-sidebar--primary .md-nav__title {
  color: #0f4f49;
  font-weight: 700;
}

.md-sidebar--primary .md-nav__link {
  border-radius: 6px;
  margin: 0.06rem 0;
  padding: 0.18rem 0.36rem;
}

.md-sidebar--primary .md-nav__link:is(:hover, :focus) {
  background: rgba(20, 184, 166, 0.11);
  color: #0f766e;
}

.md-sidebar--primary .md-nav__link--active {
  background: rgba(217, 119, 6, 0.13);
  color: #92400e;
  font-weight: 700;
}

.md-content__inner {
  padding-top: 0.55rem;
}

.md-typeset h1,
.md-typeset h2,
.md-typeset h3 {
  color: #10211f;
  letter-spacing: 0;
}

.md-typeset h1 {
  font-weight: 800;
}

.md-typeset a {
  color: #0f766e;
}

.md-typeset a:hover {
  color: #b45309;
}

.compendium-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 1.1rem;
  align-items: stretch;
  margin: 0 0 1.45rem;
  padding: 1.25rem;
  border: 1px solid var(--compendium-border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.10), rgba(245, 158, 11, 0.10)),
    var(--compendium-surface);
  box-shadow: var(--compendium-shadow);
}

.compendium-hero h1 {
  margin: 0 0 0.55rem;
  max-width: 13ch;
  color: #0d2724;
  font-size: 2.45rem;
  line-height: 1.02;
}

.compendium-hero .lead {
  max-width: 48rem;
  margin: 0 0 0.85rem;
  color: #394a46;
  font-size: 1.02rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.95rem;
}

.md-typeset .hero-actions .md-button {
  border-radius: 8px;
}

.hero-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.85rem;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
}

.hero-panel img {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 8px;
}

.hero-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.hero-stat {
  padding: 0.5rem 0.38rem;
  border: 1px solid var(--compendium-border);
  border-radius: 8px;
  background: #fbfefd;
  text-align: center;
}

.hero-stat strong {
  display: block;
  color: #0f766e;
  font-size: 1.15rem;
  line-height: 1.1;
  white-space: nowrap;
}

.hero-stat span {
  display: block;
  color: #52635f;
  font-size: 0.72rem;
  line-height: 1.2;
  white-space: nowrap;
}

.home-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 1rem 0 1.4rem;
}

.home-strip a {
  display: block;
  min-height: 100%;
  padding: 0.75rem;
  border: 1px solid var(--compendium-border);
  border-left: 4px solid #14b8a6;
  border-radius: 8px;
  background: var(--compendium-surface);
  color: #18312e;
  box-shadow: 0 6px 20px rgba(21, 33, 31, 0.05);
}

.home-strip a:nth-child(2) {
  border-left-color: var(--compendium-amber);
}

.home-strip a:nth-child(3) {
  border-left-color: #2563eb;
}

.home-strip a:nth-child(4) {
  border-left-color: var(--compendium-rose);
}

.home-strip strong {
  display: block;
  margin-bottom: 0.2rem;
}

.home-strip span {
  display: block;
  color: #586864;
  font-size: 0.74rem;
  line-height: 1.35;
}

.md-typeset .grid.cards.home-pathways > ul > li {
  border-color: var(--compendium-border);
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f7fbfa);
  box-shadow: 0 6px 18px rgba(21, 33, 31, 0.05);
}

.md-typeset .grid.cards.home-pathways > ul > li::marker {
  color: #0f766e;
}

.chapter-table table {
  overflow: hidden;
  border: 1px solid var(--compendium-border);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(21, 33, 31, 0.05);
}

.chapter-table th {
  background: #e7f4f1;
  color: #0f4f49;
}

.chapter-table tbody tr:nth-child(even) {
  background: rgba(237, 247, 245, 0.64);
}

@media screen and (max-width: 960px) {
  .compendium-hero,
  .home-strip {
    grid-template-columns: 1fr;
  }

  .compendium-hero h1 {
    max-width: none;
    font-size: 2rem;
  }
}

@media screen and (max-width: 560px) {
  .compendium-hero {
    padding: 0.9rem;
  }

  .hero-stat-grid {
    grid-template-columns: 1fr;
  }
}
`;

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

const homepagePath = join(docsDir, "index.md");
let homepage = readFileSync(homepagePath, "utf8");
homepage = homepage
  .replace(
    /^# Maths, CS & AI Compendium\r?\n\r?\n<img src="images\/logo\.png"[^>]*>\r?\n\r?\n\*\*Read online\*\*: \[henryndubuaku\.github\.io\/maths-cs-ai-compendium]\(https:\/\/henryndubuaku\.github\.io\/maths-cs-ai-compendium\/\)\r?\n/,
    `${customHomepageLead}\n`,
  )
  .replace("## Outline", learningMap);
homepage = homepage.replace(
  /(\| 20 \| Bleeding Edge AI \| quantum ML, neuromorphic ML, decentralised AI, datacenters in space, brain machine interfaces \| Coming \|\r?\n)/,
  "$1\n</div>\n",
);
writeFileSync(homepagePath, homepage, "utf8");

mkdirSync(join(docsDir, "stylesheets"), { recursive: true });
writeFileSync(join(docsDir, "stylesheets", "extra.css"), customStyles, "utf8");

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
site_url = "https://uycode.github.io/maths-cs-ai-compendium-zensical/"
site_description = "An open, intuition-first textbook covering mathematics, computer science, and artificial intelligence from the ground up."
site_author = "Henry Ndubuaku"
docs_dir = "docs"
site_dir = "site"
dev_addr = "localhost:8000"
use_directory_urls = true
extra_css = [
  "stylesheets/extra.css",
]
extra_javascript = [
  "javascripts/mathjax.js",
  "https://unpkg.com/mathjax@3/es5/tex-mml-chtml.js",
]
nav = [
${navToml}
]

[project.theme]
variant = "modern"
features = [
  "navigation.instant",
  "navigation.instant.prefetch",
  "navigation.instant.progress",
  "navigation.tabs",
  "navigation.tabs.sticky",
  "navigation.sections",
  "navigation.expand",
  "navigation.path",
  "navigation.top",
  "toc.follow",
  "content.code.copy",
]
palette.primary = "custom"
palette.accent = "custom"

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
