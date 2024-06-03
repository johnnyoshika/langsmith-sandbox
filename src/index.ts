import 'dotenv/config';
import { OpenAI } from 'openai';
import { traceable } from 'langsmith/traceable';
import { wrapOpenAI } from 'langsmith/wrappers';
import * as hub from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import express from 'express';
import { getTextFromMessageContent } from 'getTextFromMessageContent';

const app = express();

app.get('/trace', async (req, res) => {
  // Auto-trace LLM calls in-context
  const client = wrapOpenAI(new OpenAI());
  // Auto-trace this function
  const pipeline = traceable(
    async (message: string) => {
      const result = await client.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful chatbot' },
          { role: 'user', content: message },
        ],
        model: 'gpt-3.5-turbo',
      });
      return result.choices[0].message.content;
    },
    {
      run_type: 'llm',
      name: 'OpenAI Call Traceable',
      tags: ['my-tag'],
      metadata: { 'my-key': 'my-value' },
    },
  );

  const response = await pipeline(
    'What is the square root of 16? Provide the answer and an explantion.',
  );

  res.send(response);
});

app.get('/prompt', async (req, res) => {
  async function retriever(query: string) {
    return [
      'Marcus the Pig stood at the edge of the rickety wooden bridge, his hooves trembling beneath him as he faced the dark, swirling waters below. The bridge, old and worn, groaned with every gust of wind, threatening to collapse under his weight. Across the chasm, the rest of the animals from the farm watched with bated breath, their eyes wide with fear and hope. It was up to Marcus to retrieve the magical acorn that would save their drought-stricken land, but the path was treacherous and the stakes had never been higher. He took a deep breath, summoning every ounce of courage, and stepped forward, the bridge swaying perilously under his weight.',
      `Suddenly, a sharp crack echoed through the canyon as one of the bridge's planks snapped under Marcus's hoof. He teetered on the edge, his heart pounding wildly in his chest. "You can do it, Marcus!" shouted Bella the Duck from the other side, her voice barely audible over the roar of the river below. Summoning his last reserves of strength, Marcus lunged forward just as the bridge began to crumble behind him. He landed on the other side, the magical acorn clutched tightly in his mouth. Cheers erupted from the animals as Marcus lay panting on the ground, a hero who had risked everything to save his friends and their home.`,
    ];
  }

  const prompt = await hub.pull<ChatPromptTemplate>('blooms');

  const model = new ChatOpenAI();
  const runnable = prompt.pipe(model);

  const rag = traceable(
    async function rag(question: string) {
      const docs = await retriever(question);

      return await runnable.invoke(
        {
          question: `${docs.join('\n')}\n\n${question}`,
        },
        {
          runName: 'Blooms Taxonomy Level',
          metadata: { blooms: 'foo-bar' },
        },
      );
    },
    {
      name: 'RAG',
      tags: ['my-tag'],
      metadata: { 'my-key': 'my-value' },
    },
  );

  const result = await rag(
    "How does Marcus's journey across the rickety bridge illustrate the themes of courage and self-sacrifice in the story?",
  );

  const content = getTextFromMessageContent(result.content);
  const json = JSON.parse(content) as { level: number };

  res.send(json);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
