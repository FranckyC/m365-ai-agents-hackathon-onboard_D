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
    indexName: string;
    azureOpenAIApiKey: string;
    azureOpenAIEndpoint: string;
    azureOpenAIEmbeddingDeploymentName: string;
    azureAISearchApiKey: string;
    azureAISearchEndpoint: string;
}

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

    public async search(query: string): Promise<ISearchResult[]> {

        let results: ISearchResult[] = [];

        const selectedFields = [
            "id",
            "documentName",
            "content",
            "url"
        ];

        // hybrid search
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
                        // The query vector is the embedding of the user's input
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