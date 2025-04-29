import { AppCredentialAuthConfig, OnBehalfOfCredentialAuthConfig } from "@microsoft/teamsfx";

export const config = {
  MicrosoftAppId: process.env.BOT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.BOT_TENANT_ID,
  MicrosoftAppPassword: process.env.BOT_PASSWORD,
  botDomain: process.env.BOT_DOMAIN,
  authorityHost: process.env.AAD_APP_OAUTH_AUTHORITY_HOST,
  clientId: process.env.AAD_APP_CLIENT_ID,
  tenantId: process.env.AAD_APP_TENANT_ID,
  clientSecret: process.env.AAD_APP_CLIENT_SECRET,
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
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
}

export const searchConfig = {
  endpoint: process.env. AZSEARCH_ENDPOINT,
  indexName: process.env. AZSEARCH_INDEX_NAME,
  apiKey: process.env.AZSEARCH_API_KEY,
} 