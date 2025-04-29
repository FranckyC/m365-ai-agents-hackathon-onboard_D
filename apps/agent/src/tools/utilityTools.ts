import { tool } from '@langchain/core/tools';
import { z } from "zod";
import { AgentTools } from '../common/Constants';

/**
 * Format task as structured output tool from other tool outputs
 */
export const getTaskStructuredOutput = tool(

    async (args: { task: any}) => {
  
      return [
        "Task formatted successufly", 
        args.task
      ]
    },
    {
      name: AgentTools.GetTaskStructuredOutput,
      description: 'Format a task as structured output',      
      responseFormat: "content_and_artifact",
      schema: z.object({
        task: z.object({
          title: z.string().describe(`title extract from the task`).nullable(),
          summary: z.string().describe(`generated summary of what user needs to do according to task description extract and retieved content from references if available. Text only, no markdown`).nullable(),
          priority: z.number().describe(`priority extract from the task data`).nullable(),
          startDateTime: z.string().describe(`start date extract from the task data`).nullable(),
          dueDateTime: z.string().describe(`due date extract from the task data`).nullable(),
          deepLink: z.string().describe(`link extract from the task data`).nullable()
        }).nullable()
      }).describe("the task details")
    }
  );
    