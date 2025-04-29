/**
 * JSON payload sent the the /api/notification bot endpoint
 */
export interface INotificationRequest {

    /**
     * The AAD ID of the user to send the notification to
     */
    userAadId: string;   
}