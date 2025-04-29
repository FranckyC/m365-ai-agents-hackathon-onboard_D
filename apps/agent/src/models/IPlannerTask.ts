export interface IPlannerTask {
    order?: number;
    id: string;
    title: string;
    description: string;
    priority: PlannerTaskPriority
    startDateTime: string;
    dueDateTime: string;
    deepLink: string;
    percentComplete: number;
    references?: string[]
}

enum PlannerTaskPriority {
    Low = 1,
    Medium = 2,
    High = 3
}