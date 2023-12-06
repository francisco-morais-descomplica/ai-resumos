import { fileURLToPath } from "url";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import MarkdownIt from "markdown-it";
import slugify from "slugify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const template = fs.readFileSync(path.resolve(__dirname, "./ejs-template/page.ejs")).toString();

const evalsDir = path.resolve(__dirname, "../data/evaluations");
const promptsDir = path.resolve(__dirname, "../data/prompts");

const mdRenderer = new MarkdownIt();

function loadEvals() {
  const promptsDirs = fs.readdirSync(evalsDir);

  const evalsPaths = promptsDirs.map((promptDir) => {
    return {
      prompt: promptDir,
      evals: fs.readdirSync(evalsDir + "/" + promptDir),
    };
  });

  return evalsPaths;
}

function createPromptPage(promptAndEvals, allPrompts) {
  const promptMetadataRaw = fs.readFileSync(promptsDir + "/" + promptAndEvals.prompt + ".metadata.json").toString();
  const promptTemplate = fs.readFileSync(promptsDir + "/" + promptAndEvals.prompt).toString();
  const promptMetadata = JSON.parse(promptMetadataRaw);

  const evalsContent = promptAndEvals.evals.map((evalItem) => {
    const contentMd = fs.readFileSync(evalsDir + "/" + promptAndEvals.prompt + "/" + evalItem).toString();
    const contentHtml = mdRenderer.render(contentMd);

    return {
      title: slugify(evalItem).slice(0, -3),
      body: contentHtml,
    };
  });

  const renderedPage = ejs.render(template, {
    prompt: { ...promptMetadata, template: promptTemplate },
    evaluations: evalsContent,
    allPrompts,
  });

  fs.writeFileSync(path.resolve(__dirname, `../public/${promptAndEvals.prompt}.html`), renderedPage);
}

function run() {
  const evals = loadEvals();
  const allPrompts = evals.map((evalItem) => evalItem.prompt);

  evals.forEach((promptAndEvals) => {
    createPromptPage(promptAndEvals, allPrompts);
  });
}

run();
