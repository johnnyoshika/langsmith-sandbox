import 'dotenv/config';
import { OpenAI } from 'openai';
import { traceable } from 'langsmith/traceable';
import { wrapOpenAI } from 'langsmith/wrappers';
import express from 'express';
const app = express();

app.get('/trace', async (req, res) => {
  // Auto-trace LLM calls in-context
  const client = wrapOpenAI(new OpenAI());
  // Auto-trace this function
  const pipeline = traceable(async (message: string) => {
    const result = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful chatbot' },
        { role: 'user', content: message },
      ],
      model: 'gpt-3.5-turbo',
    });
    return result.choices[0].message.content;
  });

  const response = await pipeline(
    'What is the square root of 16? Provide the answer and an explantion.',
  );

  res.send(response);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
