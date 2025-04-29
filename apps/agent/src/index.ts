
import express from "express";
import adapter from "./adapter";
import path from "path";
import send from "send";

import { EmployeeOnboardingAgent } from "./bot/EmployeeOnboardingAgent";
import { INotificationRequest } from "./models/INotificationRequest";
import { StorageHelper } from "./helpers/StorageHelper";
import { TurnContext } from "botbuilder";
import { agentSystemPrompt, StorageContainers } from "./common/Constants";
import { BlobsStorage } from "botbuilder-azure-blobs";
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { AzureChatOpenAI } from '@langchain/openai';
import { updateTaskCompletion, getTaskDetails, getUserTasks } from "./tools/plannerTools";
import { searchGeneralContent, searchTaskReferenceContent } from "./tools/searchTools";
import { getTaskStructuredOutput } from "./tools/utilityTools";
import { config, openaiConfig } from "./config";

const userStorage = new BlobsStorage(config.blobConnectionString, StorageContainers.Users);
const agentTools = [getUserTasks, getTaskDetails, searchTaskReferenceContent, updateTaskCompletion, searchGeneralContent, getTaskStructuredOutput];

const agentModel = new AzureChatOpenAI({
  azureOpenAIApiKey: openaiConfig.azureOpenAIApiKey,
  azureOpenAIApiInstanceName: openaiConfig.azureOpenAIApiInstanceName,
  azureOpenAIApiDeploymentName: openaiConfig.azureOpenAIApiDeploymentName,
  azureOpenAIApiVersion: openaiConfig.azureOpenAIApiVersion,
  temperature: 0, // We don't want creativity here, only facts :D,
  cache: false,
  verbose: true // Agent logs will appear in the terminal so you can see what is going on
});

const agentCheckpointer = new MemorySaver();

// Create a Langchain agent with prebuilt StateGraph
const aiAgent = createReactAgent({
  llm: agentModel, // LLM used by the agent
  tools: agentTools, // List of tools used by the agent
  checkpointSaver: agentCheckpointer, // To be able to answer based on previous messages
  prompt: agentSystemPrompt, // Main system prompt for the agent
  interruptBefore: ["tools"] // Human-in-the-loop
});

const onboardingEmployeeAgent = new EmployeeOnboardingAgent(aiAgent);
onboardingEmployeeAgent.userStorage = userStorage;

// Create express application.
const expressApp = express();
expressApp.use(express.json());

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address());
});

// Listen for incoming requests
expressApp.post("/api/messages", async (req, res) => {
  await adapter
    .process(req, res, async (context) => {
      await onboardingEmployeeAgent.run(context);
    })
    .catch((err) => {
      // Error message including "412" means it is waiting for user's consent, which is a normal process of SSO, sholdn't throw this error.
      if (!err.message.includes("412")) {
        throw err;
      }
    });
});

// Custom notification endpoint
expressApp.post("/api/notification", async (req, res) => {
  
  const { userAadId }: INotificationRequest = req.body;

  // Get user conversation reference from storage matching the AAD Object ID
  const userInfos = await StorageHelper.getUserInfos(userStorage, userAadId);

  // Proactively notify the user (i.e continuing the conversation)
  adapter.continueConversationAsync(
    config.botId,
    userInfos.value.conversationReference,
    async (context) => {

      const ref = TurnContext.getConversationReference(context.activity);

      await context.adapter.continueConversationAsync(
        config.botId,
          ref,
          async (context) => {            
            await onboardingEmployeeAgent.notifyTasksSummary(context, userAadId);
          }
      );
    }
  );

  res.json({});
});

// SSO redirect URLs
expressApp.get(["/auth-start.html", "/auth-end.html"], async (req, res) => {
  send(
    req,
    path.join(
      __dirname,
      "./public",
      req.url.includes("auth-start.html") ? "auth-start.html" : "auth-end.html"
    )
  ).pipe(res);
});