import fs, { copyFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const miniSet = ["tempo-de-mudancas"];
const smallSet = ["novo-acordo-ortografico", "tempo-de-mudancas", "teorema-fundamental-do-calculo"];
const fullSet = smallSet.concat("redes-de-computadores", "usando-collections-p1");

const ARG_PROMPT = process.argv[2] ?? "01";
const ARG_SETTYPE = process.argv[3] ?? "mini";

function loadContents(evalSet = smallSet) {
  return evalSet.map((item) => {
    const rawContentJson = fs.readFileSync(path.resolve(__dirname, `../data/contents/${item}.json`)).toString();
    return JSON.parse(rawContentJson);
  });
}

function loadPromptTemplate(promptName) {
  return fs.readFileSync(path.resolve(__dirname, `../data/prompts/${promptName}`)).toString();
}

function hidratePrompt(prompt, content) {
  const masks = [...prompt.matchAll(/{{(\w+)}}/g)];

  const context = masks.map((mask) => {
    // Example: mask[0] = '{{mask}}'
    //          mask[1] = 'mask'
    const value = content[mask[1]];

    return [mask[0], value];
  });

  return context.reduce((prompt, [mask, value]) => {
    return prompt.replaceAll(mask, value);
  }, prompt);
}

async function runCompletion(content) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    messages: [{ role: "user", content }],
  });

  return completion.choices[0].message.content;
}

async function runStreamCompletion(prompt, promptName, content) {
  const promptDir = path.resolve(__dirname, `../data/evaluations/${promptName}/`);
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir);
  }

  const itemEvaluationFileStream = fs.createWriteStream(`${promptDir}/${content.title}.md`);

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  for await (const chunk of completion) {
    itemEvaluationFileStream.write(chunk.choices[0]?.delta?.content || "");
  }
}

function storeCompletion(promptName, contentSlug, completion) {
  const promptDir = path.resolve(__dirname, `../data/evaluations/${promptName}/`);
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir);
  }

  fs.writeFileSync(`${promptDir}/${contentSlug}.md`, completion);
}

async function run() {
  const contentSet = ARG_SETTYPE == "mini" ? miniSet : ARG_SETTYPE == "small" ? smallSet : fullSet;
  const promptTemplate = loadPromptTemplate(ARG_PROMPT);
  const contents = loadContents(contentSet);

  for (const contentItem of contents) {
    console.log(`Running ${ARG_PROMPT} @ ${contentItem.title}`);

    const prompt = hidratePrompt(promptTemplate, contentItem);
    const completion = await runStreamCompletion(prompt, ARG_PROMPT, contentItem);
    // storeCompletion(ARG_PROMPT, contentItem.title, completion);
  }
}

run();
