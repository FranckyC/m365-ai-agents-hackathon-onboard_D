import { tool } from "@langchain/core/tools";
import { AzureAISearchDataSourceOptions, AzureSearchService } from "../services/AzureSearchService";
import { z } from "zod";
import { AgentTools } from "../common/Constants";
import { ISearchResult } from "../models/ISearchResult";

const searchOptions: AzureAISearchDataSourceOptions = {
  azureAISearchApiKey: process.env.AZSEARCH_API_KEY,
  azureAISearchEndpoint: process.env.AZSEARCH_ENDPOINT,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIEmbeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
  indexName: process.env.AZSEARCH_INDEX_NAME,
};

export const searchTaskReferenceContent = tool(

    async (args: { taskName: string, references: string[] }) => {
     
        let results: ISearchResult[] = [];
        const searchService = new AzureSearchService(searchOptions);
        if (args.references) {
            const searchQuery = args.references.map(ref => `url:${ref}`).join(" OR ")
            results = await searchService.search(searchQuery);
        }

        return [
          JSON.stringify({
            taskName: args.taskName,
            referenceContent: results.map(r => r.content).join("\n")
          }),
          results
        ];    
    },
    {
      name: AgentTools.SearchTaskReferenceContent,
      description: 'Retrieve content of specific references passed as arguments',
      responseFormat: "content_and_artifact",
      schema: z.object({
        taskName: z.string().describe("the task name from which references content is retrieved"),
        references: z.string().array().describe("The reference URLs")
      }) 
    }
);

export const searchGeneralContent = tool(

  async (args: { input: string }) => {
   
    let results = [];
    const searchService = new AzureSearchService(searchOptions);
    if (args.input) {
      results = await searchService.search(args.input);
    }

    return JSON.stringify(results);        
  },
  {
    name: AgentTools.SearchGeneralContent,
    description: 'Retrieve general content for common user questions',
    responseFormat: "content",
    schema: z.object({
      input: z.string().describe("The raw input from the user")
    }) 
  }
);