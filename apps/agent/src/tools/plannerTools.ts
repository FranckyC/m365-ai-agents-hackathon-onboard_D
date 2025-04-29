import { tool } from '@langchain/core/tools';
import { PlannerService } from '../services/PlannerService';
import { Client } from '@microsoft/microsoft-graph-client';
import { IPlannerTask } from '../models/IPlannerTask';
import { z } from "zod";
import { RunnableConfig } from '@langchain/core/runnables';
import { spConfig } from "../config";
import { SharePointService } from '../services/SharePointService';
import { AgentTools } from '../common/Constants';

/**
 * Get user tasks tool
 */
export const getUserTasks = tool(
  async (args: any, config: RunnableConfig) => {
   
    let tasks: IPlannerTask[] = [];

    // Initialize Graph client instance with authProvider (can be app or delegated permissions her depending on the caller)
    const graphClient = Client.initWithMiddleware({ authProvider: config.configurable.authProvider });
    const plannerService = new PlannerService(graphClient);
    const sharePointService = new SharePointService(graphClient);
    
    // Get the plan id for that user in the employee onboarding list
    const planId = await sharePointService.getPlanForUser(spConfig.siteId, spConfig.listId, config.configurable.user_id)

    if (planId) {
      tasks = await plannerService.getPlanTasks(planId);
    }

    tasks = tasks.sort((a,b) => a.priority - b.priority).map((t,i) => { t.order = i ; return t})

    return [
      `Successfully retrieved array of ${tasks.length} tasks ${JSON.stringify(tasks.map(t => { return { id: t.id, title: t.title, priority: t.priority, references: t.references, dueDateTime: t.dueDateTime }}))} assigned to the user.`,
      tasks
    ];
  },
  {
    name: AgentTools.GetTasksForUsers,
    description: 'Get the user tasks',
    responseFormat: "content_and_artifact",
    schema: z.any().nullable()
  }
);

/**
 * Get task details tool  
 * @args taskId the task ID to get the details for
 */
export const getTaskDetails = tool(

  async (args: { taskId: string}, config: RunnableConfig) => {

      const graphClient = Client.initWithMiddleware({ authProvider: config.configurable.authProvider });
      const plannerService = new PlannerService(graphClient);

      const task: IPlannerTask = await plannerService.getTaskDetails(args.taskId);

      return [
        `Successfully retrieved information about task ${JSON.stringify(task)}`,
        task
      ];
  },
  {
    name: AgentTools.GetTaskDetails,
    description: 'Get details about a task when asked explicitly by the user',
    schema: z.object({
      taskId: z.string().describe("The unique ID of the task without modification, including lower/upper case characters")
    }),
    responseFormat: "content_and_artifact"
  }
);

/**
 * Update task completion tool
 * @args taskId the task ID to get the details for
 * @args percentComplete the completion percentage of the task to be updated
 */
export const updateTaskCompletion = tool(

  async (args: { taskId: string, percentComplete: number}, config: RunnableConfig) => {

      const graphClient = Client.initWithMiddleware({ authProvider: config.configurable.authProvider });
      const plannerService = new PlannerService(graphClient);

      await plannerService.updateTask(args.taskId, args.percentComplete);

      return `Successfully completed task with ID ${args.taskId}`;
  },
  {
    name: AgentTools.UpdateTaskCompletion,
    description: 'Update completion of a specific task',
    schema: z.object({
      taskName: z.string().describe("The name of the task to be udpated. Purely informative"),
      taskId: z.string().describe("The unique ID of the task without modification, including lower/upper case characters"),
      percentComplete: z.number().describe("The completion as percentage ofthe task. 100 is completed. 0 is not started") 
    }),
    responseFormat: "content"
  }
);
  