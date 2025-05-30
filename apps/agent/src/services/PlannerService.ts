import { Client } from "@microsoft/microsoft-graph-client";
import { IPlannerTask } from "../models/IPlannerTask";

/**
 * Planner service
 */
export class PlannerService {

    private _graphClient: Client;

    constructor(client: Client) {
        this._graphClient = client;
    }

    /**
     * Retrieve the tasks for a given plan ID
     * @param planId the plan ID to get the tasks for
     * @returns list of tasks for the plan
     */
    public async getPlanTasks(planId: string): Promise<IPlannerTask[]> {

        try {        
            
            const response = await this._graphClient.api(`/planner/plans/${planId}/tasks?$expand=details`).get();
        
            const tasks: IPlannerTask[] = response.value.map(item => {
                return {
                    id: item.id,
                    planId: item.planId,
                    title: item.title,
                    description: item?.details?.description,
                    priority: item.priority,
                    startDateTime: item.startDateTime,
                    dueDateTime: item.dueDateTime,
                    percentComplete: item.percentComplete,
                    deepLink: `https://planner.cloud.microsoft/webui/plan/${item.planId}/view/board/task/${item.id}`,
                    references: item.details.references ? Object.keys(item.details.references).map(r => decodeURIComponent(r)) : []
                };
            });

            return tasks.filter(task => task.percentComplete < 100); //Planner API doesn't support OData filters...
        }
        catch (e) {
            throw `[PlannerService::getPlanTasks] There was an error during tasks retrieval. Details ${JSON.stringify(e)}`;
        }
    }

    /**
     * Retrieve the details for a given task ID
     * @param taskId the task ID to get the details for
     * @returns the task details
     */
    public async getTaskDetails(taskId: string): Promise<IPlannerTask> {

        try {        
        
            const response = await this._graphClient.api(`/planner/tasks/${taskId}?$expand=details`).get();

            return {
                planId: response.planId,
                id: response.id,
                title: response.title,
                description: response?.details?.description,
                priority: response.priority,
                startDateTime: response.startDateTime,
                dueDateTime: response.dueDateTime,
                percentComplete: response.percentComplete,
                deepLink: `https://planner.cloud.microsoft/webui/plan/${response.planId}/view/board/task/${response.id}`,
                references: response.details.references ? Object.keys(response.details.references).map(r => decodeURIComponent(r)) : []
            } as IPlannerTask;

        }
        catch (e) {
            throw `[PlannerService::getPlanTasks] There was an error during task retrieval. Details ${JSON.stringify(e)}`;
        }
    }

    /**
     * Update the percent complete for a given task ID
     * @param taskId the task ID to complete 
     * @param percentComplete the percent complete to set for the task (0 to 100)
     */
    public async updateTask(taskId: string, percentComplete: number): Promise<void> {

        try {        
            const response = await this._graphClient.api(`/planner/tasks/${taskId}?$expand=details`).get();
        
            await this._graphClient.api(`/planner/tasks/${taskId}`).headers({
                "If-Match": decodeURIComponent(response["@odata.etag"])
            }).patch({
                percentComplete: percentComplete
            });
        }
        catch (e) {
            throw `[PlannerService::completeTask] There was an error during task update. Details ${JSON.stringify(e)}`;
        }
    }
}