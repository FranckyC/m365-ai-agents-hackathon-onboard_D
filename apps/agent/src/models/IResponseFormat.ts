export interface IResponseFormat {
    answer: string;
    taskDetails?: {
        title: string;
        summary: string;
        priority: number;
        startDateTime: string;
        dueDateTime: string;
        deepLink: string;
    }
};