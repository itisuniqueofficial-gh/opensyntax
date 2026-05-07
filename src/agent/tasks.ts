import type {TaskState} from '../session/history.js';
import type {Session, TodoItem} from '../session/types.js';

export function syncTodosFromPlan(session: Session): void {
  const existing = new Map(session.todos.map((todo) => [todo.id, todo]));
  session.todos = session.plan.map<TodoItem>((item) => ({
    id: item.id,
    content: item.content,
    state: existing.get(item.id)?.state ?? item.state
  }));
}

export function updateTodoState(session: Session, id: string, state: TaskState): void {
  session.todos = session.todos.map((todo) => todo.id === id ? {...todo, state} : todo);
}

export function taskSummary(session: Session): string {
  if (!session.plan.length) return 'No active tasks.';
  const done = session.plan.filter((item) => item.state === 'completed').length;
  const failed = session.plan.filter((item) => item.state === 'failed').length;
  return `Tasks: ${done}/${session.plan.length} complete${failed ? `, ${failed} failed` : ''}`;
}
