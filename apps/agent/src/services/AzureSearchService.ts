import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { ISearchResult } from "../models/ISearchResult";
import { OpenAIEmbeddings } from "@microsoft/teams-ai";

export interface Document {
    id: string;
    documentName: string;
    embeddings: number[] | null;
    content: string;
    url: string;
}

export interface AzureAISearchDataSourceOptions {

    /**
     * Search index name
     */
    indexName: string;

    /**
     * Azure OpenAI API key
     */
    azureOpenAIApiKey: string;

    /**
     * Azure OpenAI API endpoint
     */
    azureOpenAIEndpoint: string;

    /**
     * Azure OpenAI API deployment name
     */
    azureOpenAIEmbeddingDeploymentName: string;

    /**
     * Azure AI Search API key
     */
    azureAISearchApiKey: string;

    /**
     * Azure AI Search endpoint
     */
    azureAISearchEndpoint: string;
}

/**
 * Azure AI Search Service
 */
export class AzureSearchService {

    private readonly searchClient: SearchClient<Document>;
    private readonly options: AzureAISearchDataSourceOptions;

    constructor (options: AzureAISearchDataSourceOptions) {

        this.options = options;

        this.searchClient = new SearchClient<Document>(
            options.azureAISearchEndpoint,
            options.indexName,
            new AzureKeyCredential(options.azureAISearchApiKey)
        );
    }

    /**
     * Search the Azure AI Search index for the given query
     * @param query The search query (i.e. user input)
     * @returns corresponding search results
     */
    public async search(query: string): Promise<ISearchResult[]> {

        let results: ISearchResult[] = [];

        const selectedFields = [
            "id",
            "documentName",
            "content",
            "url"
        ];

        try {  

            const queryVector: number[] = await this.getEmbeddingVector(query);
            const searchResults = await this.searchClient.search(query, {
                searchFields: ["content"],
                select: selectedFields as any,
                top: 10,
                vectorSearchOptions: {
                    queries: [
                        {
                            kind: "vector",
                            fields: ["embeddings"],
                            kNearestNeighborsCount: 2,
                            vector: queryVector
                        }
                    ]
                },
            });

            if (!searchResults.results) {
                return [];
            }

            for await (const result of searchResults.results) {
                results.push({
                    content: result.document.content,
                    documentName: result.document.documentName,
                    id: result.document.id,
                    url: result.document.url
                })
            }
        } catch (e) {
            throw `[AzureSearchService::search] There was an error during search. Details ${JSON.stringify(e)}`;
        }

        return results;
    }

    private async getEmbeddingVector(text: string): Promise<number[]> {

        const embeddings = new OpenAIEmbeddings({
            azureApiKey: this.options.azureOpenAIApiKey,
            azureEndpoint: this.options.azureOpenAIEndpoint,
            azureDeployment: this.options.azureOpenAIEmbeddingDeploymentName,
        });

        const result = await embeddings.createEmbeddings(this.options.azureOpenAIEmbeddingDeploymentName, text);

        if (result.status !== "success" || !result.output) {
            throw new Error(`Failed to generate embeddings for description: ${text}`);
        }

        return result.output[0];
    }
} 