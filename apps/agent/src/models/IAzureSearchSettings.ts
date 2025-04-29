/**
 * Azure AI Search settings
 */
export interface IAzureSearchSettings {

    /**
     * The endpoint of the Azure Search service
     * @example "https://<your-search-service-name>.search.windows.net"
     */
    endpoint: string;

    /**
     * The API key for the Azure Search service
     */
    apiKey: string;

    /**
     * The name of the Azure Search index to use for searching
     * @example "my-index"
     */
    indexName: string;
}