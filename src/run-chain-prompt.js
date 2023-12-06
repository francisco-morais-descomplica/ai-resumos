import fs, { copyFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const miniSet = ["novo-acordo-ortografico"];
const smallSet = ["novo-acordo-ortografico", "tempo-de-mudancas", "teorema-fundamental-do-calculo"];
const fullSet = smallSet.concat("redes-de-computadores", "usando-collections-p1");

const ARG_PROMPT = process.argv[2] ?? "04";
const ARG_SETTYPE = process.argv[3] ?? "mini";
const PROMPTS_DIR = path.resolve(__dirname, `../data/prompts/`);
const CONTENTS_DIR = path.resolve(__dirname, `../data/contents/`);

function loadContents(evalSet = smallSet) {
  return evalSet.map((item) => {
    const rawContentJson = fs.readFileSync(`${CONTENTS_DIR}/${item}.json`).toString();
    return JSON.parse(rawContentJson);
  });
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

async function runCompletion(body) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-16k",
    temperature: 0.2,
    messages: [{ role: "user", content: body }],
  });

  return completion.choices[0].message.content;
}

async function runStreamCompletion(body, evalPath, temperature = 1) {
  const dir = path.dirname(evalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const itemEvaluationFileStream = fs.createWriteStream(evalPath);

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-16k",
    messages: [{ role: "user", content: body }],
    temperature,
    stream: true,
  });

  for await (const chunk of completion) {
    itemEvaluationFileStream.write(chunk.choices[0]?.delta?.content || "");
  }
}

async function stepOneMindMap(content) {
  const promptTemplate = fs.readFileSync(`${PROMPTS_DIR}/04_1`).toString();

  const prompt = hidratePrompt(promptTemplate, content);

  console.log("prompt", prompt);

  const completion = await runCompletion(prompt);

  return completion.split("Tópicos relevantes para exercícios:")[1] ?? "";
}

async function stepTwoCreateRawMaterial(content, relevantTopics) {
  const promptTemplate = fs.readFileSync(`${PROMPTS_DIR}/04_2`).toString();

  const prompt = hidratePrompt(promptTemplate, {
    ...content,
    relevantTopics,
  });

  console.log("prompt", prompt);

  return runCompletion(prompt);
}

async function stepThreeCreateStylishMaterial(content, rawMaterial) {
  const promptTemplate = fs.readFileSync(`${PROMPTS_DIR}/04_3`).toString();

  const prompt = hidratePrompt(promptTemplate, {
    ...content,
    rawMaterial,
  });

  const evalPath = path.resolve(__dirname, `../data/evaluations/04/${content.title}.md`);
  await runStreamCompletion(prompt, evalPath, 0.5);
}

async function run() {
  const contentSet = ARG_SETTYPE == "mini" ? miniSet : ARG_SETTYPE == "small" ? smallSet : fullSet;
  const contents = loadContents(contentSet);

  for (const contentItem of contents) {
    console.log(`Running ${ARG_PROMPT} @ ${contentItem.title}`);

    const relevantTopics = await stepOneMindMap(contentItem);
    console.log("Relevant topics", relevantTopics);

    const rawMaterial = await stepTwoCreateRawMaterial(contentItem, relevantTopics);
    console.log("Raw material", rawMaterial);
    // const rawMaterial = `A história é marcada por transformações que causam um impacto significativo na sociedade. Em um curto período de tempo, tudo muda e as pessoas nem conseguem imaginar como seus antepassados viviam. A tecnologia e as comunicações são os principais impulsionadores dessas mudanças, criando novos paradigmas e definindo novas formas de fazer negócios e liderar pessoas. Vivemos em uma era de grandes mudanças, onde a tecnologia da informação e da comunicação integra a maior parte da sociedade economicamente relevante, revolucionando a forma como trabalhamos e nos relacionamos.

    // Essas mudanças constantes exigem que os indivíduos sejam flexíveis, adaptáveis e otimistas. A transformação mais significativa está na gestão de pessoas, onde o conhecimento se tornou tão importante quanto o capital financeiro. O surgimento de novas empresas e a ascensão da "sociedade do conhecimento" permitiram que os trabalhadores se tornassem donos dos meios de produção e do produto do seu trabalho. Eles têm a liberdade de fazer seus próprios horários, controlar sua produção e cuidar do seu autodesenvolvimento.

    // Os avanços tecnológicos também têm um impacto significativo na economia e na sociedade. Por exemplo, a pílula anticoncepcional permitiu que as mulheres planejassem e controlassem suas vidas, o que resultou em uma maior participação no mercado de trabalho. Essa mudança na estrutura familiar levou ao surgimento de novos produtos e serviços, como lanchonetes fast food e comidas congeladas. Esses produtos são soluções para os problemas criados pela entrada das mulheres no mercado de trabalho.

    // Diante dessas mudanças, os novos profissionais enfrentam o desafio de ajudar a criar o novo e mobilizar as pessoas para implementar as mudanças necessárias. Para ter sucesso nesse ambiente em constante transformação, é essencial que os profissionais se conheçam bem e também conheçam os outros. O autoconhecimento permite que eles entendam como agem e reagem, o que sabem, do que gostam e o que querem. Além disso, é importante compreender como os outros agem e reagem, o que sabem, do que gostam e o que querem.

    // Outro aspecto fundamental é estabelecer prioridades no trabalho. Os profissionais devem classificar suas prioridades, como conteúdo do trabalho, qualidade das relações, salário, nível de responsabilidade, promoção, formação, grau de autonomia, ambiente e mobilidade profissional. Essas prioridades podem variar de acordo com cada indivíduo, e é importante entender o motivo por trás de cada escolha.

    // Em resumo, vivemos em tempos de grandes mudanças impulsionadas pela tecnologia e pelas comunicações. Essas mudanças afetam tanto a sociedade quanto as organizações, exigindo que os profissionais sejam flexíveis, adaptáveis e otimistas. O autoconhecimento e o conhecimento dos outros são essenciais para enfrentar esses desafios. Além disso, é importante estabelecer prioridades no trabalho e entender o motivo por trás de cada escolha.
    // Styled material ## Introdução

    // Nos tempos atuais, estamos vivenciando grandes mudanças em diversos aspectos da nossa vida. Seja na tecnologia, na economia, na política ou na sociedade como um todo, é inegável que estamos passando por transformações significativas.`;

    await stepThreeCreateStylishMaterial(contentItem, rawMaterial);
  }
}

run();
