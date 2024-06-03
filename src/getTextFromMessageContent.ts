import { MessageContent } from '@langchain/core/dist/messages/base';

export const getTextFromMessageContent = (
  content: MessageContent,
): string => {
  if (typeof content === 'string') return content;

  let texts: string[] = [];

  if (Array.isArray(content))
    content.forEach(item => {
      if (typeof item === 'string') texts.push(item);
      else if (item.type === 'text') texts.push(item.text);
    });

  return texts.join('\n');
};
