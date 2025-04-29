import { Client } from "@microsoft/microsoft-graph-client";

/**
 * SharePoint Service
 */
export class SharePointService {

    private _graphClient: Client;

    constructor(client: Client) {
        this._graphClient = client;
    }

    /**
     * Retrieve the Planner plan ID for a user in the Employee Onboarding SharePoint list
     * @param siteId the SharePoint site ID
     * @param listId the SharePoint list ID
     * @param userId the user ID to get the plan for
     * @returns the Planner plan ID for the user
     */
    public async getPlanForUser(siteId: string, listId: string, userId: string): Promise<string> {

        try {        
                       
            // Get plan Id for the user in the Employee Onboarding list
            // We expect the 'contosoEmployeedAadObjectId' to be populated automatically by the onboarding flow to facilitate info retrieval
            const response = await this._graphClient
                .api(`/sites/${siteId}/lists/${listId}/items?expand=fields(select=contosoEmployeePlanId)&$filter=fields/contosoEmployeedAadObjectId eq '${userId}'`)
                .headers({
                    'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly'
                }).get();
            return response?.value[0].fields?.contosoEmployeePlanId;
        }
        catch (e) {
            throw `[SharePointServie::getPlanForUser] There was an error during tasks retrieval. Details ${JSON.stringify(e)}`;
        }
    }
}
