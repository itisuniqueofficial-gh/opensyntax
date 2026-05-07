import chalk from 'chalk';
import {highlight} from 'cli-highlight';

export function renderMarkdown(text: string): string {
  return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language: string, code: string) => {
    const rendered = highlight(code.trimEnd(), {language: language || 'text', ignoreIllegals: true});
    return `\n${chalk.gray('```' + (language || ''))}\n${rendered}\n${chalk.gray('```')}\n`;
  }).replace(/^### (.*)$/gm, chalk.bold.cyan('$1')).replace(/^## (.*)$/gm, chalk.bold.cyan('$1')).replace(/^# (.*)$/gm, chalk.bold.cyan('$1')).replace(/`([^`]+)`/g, (_, code: string) => chalk.yellow(code));
}
