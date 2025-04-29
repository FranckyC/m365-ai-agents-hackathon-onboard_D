/**
 * Search result from Azure AI Search index
 */
export interface ISearchResult {

    /**
     * The id of the document in the Azure Search index
     */
    id: string;

    /**
     * The name of the document in the Azure Search index
     */
    documentName: string;

    /**
     * The content of the document in the Azure Search index
     */
    content: string;

    /**
     * The URL of the document in the Azure Search index
     */
    url: string;
}