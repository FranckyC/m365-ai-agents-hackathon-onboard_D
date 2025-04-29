import { AppCredentialAuthConfig, OnBehalfOfCredentialAuthConfig } from "@microsoft/teamsfx";

export const config = {
  botId: process.env.BOT_ID,
  botPassword: process.env.BOT_PASSWORD,
  botDomain: process.env.BOT_DOMAIN,
  blobConnectionString: process.env.BLOB_CONNECTION_STRING
};

// Auth configuration for client credentials flow
export const appAuthConfig: AppCredentialAuthConfig = {
  authorityHost: process.env.AAD_APP_OAUTH_AUTHORITY_HOST,
  clientId: process.env.AAD_APP_CLIENT_ID,
  tenantId: process.env.AAD_APP_TENANT_ID,
  clientSecret: process.env.AAD_APP_CLIENT_SECRET
};

// Auth configuration for on-behalf flow
export const oboAuthConfig: OnBehalfOfCredentialAuthConfig = {
  authorityHost: process.env.AAD_APP_OAUTH_AUTHORITY_HOST,
  clientId: process.env.AAD_APP_CLIENT_ID,
  tenantId: process.env.AAD_APP_TENANT_ID,
  clientSecret: process.env.AAD_APP_CLIENT_SECRET
};

// SharePoint configurationto get the plan ID for the current user
export const spConfig = {
  siteId: process.env.SP_EMPLOYEEONBOARDING_SITE_ID,
  listId: process.env.SP_EMPLOYEEONBOARDING_LIST_ID
};

// Azure OpenAI configuration
export const openaiConfig = {
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  azureOpenAIEmbeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
};

// Azure AI Search configuration
export const searchConfig = {
  indexName: process.env. AZSEARCH_INDEX_NAME,
  azureAISearchApiKey: process.env.AZSEARCH_API_KEY,
  azureAISearchEndpoint: process.env.AZSEARCH_ENDPOINT
}; 