import { ActionExecution } from '../types';

export function parseActionsFromContent(content: string): {
  cleanContent: string;
  actions: ActionExecution[];
} {
  const actions: ActionExecution[] = [];

  // Match ```action\n{...}\n``` or ```json:action\n{...}\n```
  const actionRegex = /```(?:action|json:action)\s*\n([\s\S]*?)\n```/gi;

  let cleanContent = content.replace(actionRegex, (_, jsonString) => {
    try {
      const parsed = JSON.parse(jsonString.trim());
      if (parsed && typeof parsed === 'object') {
        actions.push({
          type: parsed.type || 'add_task',
          title: parsed.title,
          category: parsed.category || 'general',
          priority: parsed.priority || 'medium',
          dueDate: parsed.dueDate,
          theme: parsed.theme,
          content: parsed.content,
          fact: parsed.fact || parsed.memory || parsed.text,
          to: parsed.to,
          subject: parsed.subject,
          body: parsed.body,
          query: parsed.query,
          startDateTime: parsed.startDateTime || parsed.start_time || parsed.start,
          endDateTime: parsed.endDateTime || parsed.end_time || parsed.end,
          link: parsed.link || parsed.url,
          raw: jsonString.trim(),
        });
      }
    } catch {
      // Ignore malformed JSON block
    }
    return ''; // Remove the raw code block from visible message text
  }).trim();

  return {
    cleanContent,
    actions,
  };
}
