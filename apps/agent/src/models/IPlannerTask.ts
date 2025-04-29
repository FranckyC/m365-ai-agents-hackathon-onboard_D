/**
 * Represents a task in the planner.
 */
export interface IPlannerTask {

    /**
     * Order of the task
     */
    order?: number;

    /**
     * ID of the plan the task belongs to
     */
    id: string;

    /**
     * Title of the task
     */
    title: string;

    /**
     * Description of the task
     */
    description: string;

    /**
     * Priority of the task. From 0 to 10
     */
    priority: PlannerTaskPriority;

    /**
     * Start date and time of the task in ISO 8601 format
     * e.g. "2023-10-01T00:00:00Z"
     */
    startDateTime: string;

    /**
     * Due date and time of the task in ISO 8601 format 
     * e.g. "2023-10-01T00:00:00Z"
     */
    dueDateTime: string;

    /**
     * Deep link to the task in the planner
     */
    deepLink: string;

    /**
     * Percentage of completion of the task. From 0 to 100
     */
    percentComplete: number;

    /**
     * References to other documents related to this task
     */
    references?: string[]
}

enum PlannerTaskPriority {
    Low = 1,
    Medium = 2,
    High = 3
}