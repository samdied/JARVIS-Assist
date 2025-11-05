import React, { useState, useEffect, useRef } from 'react';
import { handleTaskCommand } from '../services/geminiService';
import JARSISOutput from './common/JARSISOutput';
import UserQueryInput from './common/UserQueryInput';
import { JARVIS_ERROR_PREFIX } from '../constants';
import { getJarvisPrefix } from '../utils/jarvisPersona';
import TaskService from '../services/taskService';
import { Task, TaskStatus } from '../types';

const TaskMaster: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jarvisResponse, setJarvisResponse] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const refreshTasks = () => {
    const result = TaskService.listTasks();
    if (result.success && result.data) {
      setTasks(result.data);
    } else {
      setError(result.message);
    }
  };

  useEffect(() => {
    refreshTasks(); // Load tasks on component mount
  }, []);

  const handleCommand = async (command: string) => {
    setError(null);
    setJarvisResponse(null);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      setJarvisResponse(`${getJarvisPrefix()} Processing task command: "${command}"...`);

      const response = await handleTaskCommand(command);
      setJarvisResponse(response);
      refreshTasks(); // Refresh tasks after any command potentially modifies them
    } catch (err) {
      console.error("J.A.R.V.I.S. reports: Task Management Protocol Error:", err);
      setError(`${JARVIS_ERROR_PREFIX} An unhandled error occurred during task command processing.`);
      setJarvisResponse(null);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING:
        return 'text-yellow-400';
      case TaskStatus.IN_PROGRESS:
        return 'text-blue-400';
      case TaskStatus.COMPLETED:
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Task Management Protocol</h2>
      <p className="text-gray-300 mb-4">
        Command J.A.R.V.I.S. to manage your operational tasks.
        You can create, list, update, and delete tasks by providing natural language instructions.
      </p>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
      )}

      <UserQueryInput
        onQuery={handleCommand}
        isLoading={isLoading}
        placeholder="e.g., 'Create a task to finalize project report due 2024-12-31', 'List all pending tasks', 'Update task TSK-001 status to completed', 'Delete task TSK-002', Sir/Ma'am."
      />

      {jarvisResponse && (
        <div className="mt-6">
          <JARSISOutput text={jarvisResponse} isStreaming={isStreaming} />
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 text-gray-200">Current Task Roster:</h3>
        {tasks.length === 0 ? (
          <p className="text-gray-400">No active tasks detected, Sir.</p>
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <p className="text-lg font-semibold text-blue-300 mb-1">{task.description}</p>
                  <p className="text-sm text-gray-300">ID: <span className="font-mono text-gray-100">{task.id}</span></p>
                  <p className="text-sm text-gray-300">Due: <span className="text-gray-100">{task.dueDate}</span></p>
                  <p className="text-sm text-gray-300">Status: <span className={`font-medium ${getStatusColor(task.status)}`}>{task.status.replace(/_/g, ' ')}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMaster;