import { Task, TaskStatus } from '../types';
import { JARVIS_ERROR_PREFIX } from '../constants';

/**
 * Manages tasks in an in-memory storage.
 * In a production environment, this would interact with a backend API or persistent storage.
 */
let tasks: Task[] = [];
let nextTaskId = 1;

interface TaskServiceResult<T> {
  success: boolean;
  message: string;
  data?: T;
}

const TaskService = {
  /**
   * Creates a new task.
   * @param description The task description.
   * @param dueDate The due date for the task (ISO string or simple date).
   * @returns The newly created task or an error message.
   */
  createTask(description: string, dueDate: string): TaskServiceResult<Task> {
    if (!description || !dueDate) {
      return { success: false, message: `${JARVIS_ERROR_PREFIX} Task description and due date are mandatory for task creation.` };
    }
    const newId = `TSK-${String(nextTaskId++).padStart(3, '0')}`;
    const newTask: Task = {
      id: newId,
      description,
      dueDate,
      status: TaskStatus.PENDING,
    };
    tasks.push(newTask);
    return { success: true, message: `Task created. ID: ${newId}.`, data: newTask };
  },

  /**
   * Lists tasks based on optional filters.
   * @param status Optional status to filter by.
   * @param dueDate Optional due date to filter by.
   * @returns An array of matching tasks or an error message.
   */
  listTasks(status?: TaskStatus, dueDate?: string): TaskServiceResult<Task[]> {
    let filteredTasks = [...tasks];

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    if (dueDate) {
      filteredTasks = filteredTasks.filter(task => task.dueDate === dueDate);
    }

    if (filteredTasks.length === 0) {
      return { success: true, message: 'No tasks match the specified criteria.', data: [] };
    }

    // Sort tasks by due date, then by status (pending, in_progress, completed)
    filteredTasks.sort((a, b) => {
      // Primary sort by due date
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }

      // Secondary sort by status priority
      const statusOrder = { [TaskStatus.PENDING]: 1, [TaskStatus.IN_PROGRESS]: 2, [TaskStatus.COMPLETED]: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return { success: true, message: 'Task roster retrieved.', data: filteredTasks };
  },

  /**
   * Updates an existing task.
   * @param id The ID of the task to update.
   * @param description New description (optional).
   * @param dueDate New due date (optional).
   * @param status New status (optional).
   * @returns The updated task or an error message.
   */
  updateTask(id: string, description?: string, dueDate?: string, status?: TaskStatus): TaskServiceResult<Task> {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return { success: false, message: `${JARVIS_ERROR_PREFIX} Task with ID '${id}' not found.` };
    }

    const updatedTask = { ...tasks[taskIndex] };
    if (description) {
      updatedTask.description = description;
    }
    if (dueDate) {
      updatedTask.dueDate = dueDate;
    }
    if (status) {
      updatedTask.status = status;
    }

    tasks[taskIndex] = updatedTask;
    return { success: true, message: `Task ID '${id}' updated.`, data: updatedTask };
  },

  /**
   * Deletes a task.
   * @param id The ID of the task to delete.
   * @returns Confirmation message or error.
   */
  deleteTask(id: string): TaskServiceResult<undefined> {
    const initialLength = tasks.length;
    tasks = tasks.filter(task => task.id !== id);
    if (tasks.length < initialLength) {
      return { success: true, message: `Task ID '${id}' successfully purged.` };
    }
    return { success: false, message: `${JARVIS_ERROR_PREFIX} Task with ID '${id}' not found for deletion.` };
  },

  /**
   * Retrieves a single task by ID.
   * @param id The ID of the task.
   * @returns The task or null if not found.
   */
  getTaskById(id: string): Task | null {
    return tasks.find(task => task.id === id) || null;
  }
};

export default TaskService;