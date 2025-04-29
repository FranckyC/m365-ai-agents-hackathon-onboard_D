import {
  Dialog,
  DialogSet,
  DialogTurnStatus,
  WaterfallDialog,
  ComponentDialog,
  WaterfallStepContext,
  DialogTurnResult} from "botbuilder-dialogs";
import {
  Activity,
  ActivityTypes,
  StatePropertyAccessor,
  Storage,
  tokenExchangeOperationName,
  TurnContext,
} from "botbuilder";
import { OnBehalfOfCredentialAuthConfig, OnBehalfOfUserCredential, TeamsBotSsoPrompt, TeamsBotSsoPromptSettings } from "@microsoft/teamsfx";
import { config, oboAuthConfig } from "../config";
import { AgentTools, MicrosoftGraphScopes } from "../common/Constants";
import { HumanInTheLoopDialog } from "./humanInTheLoopDialog";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { updateTaskCompletion, getTaskDetails, getUserTasks } from "../tools/plannerTools";
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { searchGeneralContent, searchTaskReferenceContent } from "../tools/searchTools";
import { AnswerFormatHelper } from "../helpers/AnswerFormatHelper";
import { getTaskStructuredOutput } from "../tools/utilityTools";

const AGENT_DIALOG = "AGENT_DIALOG";
const MAIN_WATERFALL_DIALOG = "MAIN_WATERFALL_DIALOG";
const HUMAN_IN_THE_LOOP_DIALOG = "HUMAN_IN_THE_LOOP_DIALOG";
const TEAMS_SSO_PROMPT_ID = "TEAMS_SSO_DIALOG";

// Reused from https://github.com/OfficeDev/teams-toolkit-samples/tree/dev/bot-sso/src

/**
 * Data to be passed on the human-in-the-loop dialog
 * @interface IAgentStepData
 */
export interface IAgentStepData {
  /**
   * The LLM selected tool calls
   */
  toolCalls: any[];

  /**
   * The SSO token used for authentication
   */
  ssoToken: string;

  /**
   * The list of already passed messages to the agent
   */
  messages: BaseMessage[];
}

/**
 * Main dialog for the agent bot. Every conversation with the bot will be handled by this dialog.
 */
export class AgentDialog extends ComponentDialog {

  private dedupStorage: Storage;
  private dedupStorageKeys: string[];

  private agent: any;

  constructor(dedupStorage: Storage, agent: any) {

    super(AGENT_DIALOG);

    this.agent = agent;

    const settings: TeamsBotSsoPromptSettings = {
      scopes: [MicrosoftGraphScopes.TasksReadWrite, MicrosoftGraphScopes.SiteReadAll], // Permissions needed by agent tools
      timeout: 900000,
      endOnInvalidMessage: true,
    };
  
    const delegatedAuthConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: oboAuthConfig.authorityHost,
      clientId: oboAuthConfig.clientId,
      tenantId: oboAuthConfig.tenantId,
      clientSecret: oboAuthConfig.clientSecret
    };

    const initialLoginEndpoint = `https://${config.botDomain}/auth-start.html`;

    const loginDialog = new TeamsBotSsoPrompt(
      delegatedAuthConfig,
      initialLoginEndpoint,
      TEAMS_SSO_PROMPT_ID,
      settings
    );

    this.addDialog(loginDialog);
    this.addDialog(new HumanInTheLoopDialog(HUMAN_IN_THE_LOOP_DIALOG));

    // Dialogs will be executed in sequence in the order they are added.
    this.addDialog(
      new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
        this.loginStep.bind(this),
        this.dedupStep.bind(this),
        this.agentResponseStep.bind(this),
        this.finalizeResponseStep.bind(this)
      ])
    );

    this.initialDialogId = MAIN_WATERFALL_DIALOG;
    this.dedupStorage = dedupStorage;
    this.dedupStorageKeys = [];
  }

  async run(context: TurnContext, dialogState: StatePropertyAccessor) {
    const dialogSet = new DialogSet(dialogState);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    let dialogTurnResult = await dialogContext.continueDialog();
    if (dialogTurnResult && dialogTurnResult.status === DialogTurnStatus.empty) {
      dialogTurnResult = await dialogContext.beginDialog(this.id);
    }
  }

  //#region Dialog steps

  /**
   * Login the current user. The first, time, the user will have to consent directly from the Teams conversation
   * @param stepContext The waterfall step context
   * @returns The turn result
   */
  public async loginStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
      const turnContext = stepContext.context as TurnContext;
      stepContext.options['text'] = this.getActivityText(turnContext.activity);

      return await stepContext.beginDialog(TEAMS_SSO_PROMPT_ID);
  }

  /**
   * Deduplicate the token exchange request. If the user is logged in from multiple Teams clients, only one of them should be processed.
   * @param stepContext The waterfall step context
   * @returns The turn result 
   */
  public async dedupStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
      const tokenResponse = stepContext.result;
      // Only dedup after ssoStep to make sure that all Teams client would receive the login request
      if (tokenResponse && (await this.shouldDedup(stepContext.context))) {
          return Dialog.EndOfTurn;
      }
      return await stepContext.next(tokenResponse);
  }

  /**
   * Process the user input and invoke the agent to get a response.
   * The agent will use the tools to get the information needed to answer the user question.
   * @param stepContext The waterfall step context
   * @returns The turn result 
   */
  public async agentResponseStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {

      const tokenResponse = stepContext.result;
      if (!tokenResponse || !tokenResponse.ssoToken) {
          throw new Error("There is an issue while trying to sign you in and run your command. Please try again.");
      }
      
      const context: TurnContext = stepContext.context;
      
      // When engaged directy in a conversation, the bot will always use delegated permissions through an on-behalf-of flow (aka. obo).
      const oboCredential = new OnBehalfOfUserCredential(tokenResponse.ssoToken, oboAuthConfig);
      const authProvider = new TokenCredentialAuthenticationProvider(
          oboCredential,
          {
              scopes: [MicrosoftGraphScopes.TasksReadWrite, MicrosoftGraphScopes.SiteReadAll] // Delegated scopes
          }
      );

      const messages: BaseMessage[] =  [
          new HumanMessage(stepContext.options["text"]) // "text" is this user input text passed from dialogs
      ];

      const runnableConfig = {
        user_id: context.activity.from.aadObjectId,
        authProvider: authProvider,
        thread_id: context.activity.conversation!.id 
      };

      const llmResponse = await this.agent.invoke(
          { messages: messages },
          { configurable: runnableConfig}
      );

      // Check tools selected by the agent
      const toolCalls = llmResponse.messages[llmResponse.messages.length-1].tool_calls
    
      // Data to be passed across dialogs
      const modelData = {
        ssoToken: tokenResponse.ssoToken,
        toolCalls: toolCalls,
        messages: llmResponse.messages
      } as IAgentStepData;
      
      // Determine which tool needs a human in the loop and an explicit confirmation to be executed
      for (const selectedTool of toolCalls) {
      
        switch (selectedTool?.name) {

          case 'UpdateTaskCompletion':
            return await stepContext.beginDialog(HUMAN_IN_THE_LOOP_DIALOG, modelData);
  
          default:
            break;
        }
      }
      
      // If tools has been selected, we finalize the agent answer by invoking them.
      if (toolCalls.length > 0) {
        await this.finalizeAgentAnswer(stepContext, modelData);
      } else {
        // If no tools selected, we just send the answer to the user
        await AnswerFormatHelper.formatAgentResponse(stepContext.context as TurnContext, llmResponse);
      }

      return await stepContext.endDialog();
  }

  /**
   * Finazlize the agent answer after a Human-in-the-loop step.
   * @param stepContext The waterfall step context
   * @returns The turn result
   */
  public async finalizeResponseStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {

    // Get output from human-in-the-loop step)
    const { userAnswer, modelData} = stepContext.result;

    if (userAnswer) {
      await this.finalizeAgentAnswer(stepContext, modelData);
    } else {
      stepContext.context.sendActivity("That's OK, let me know if you can do anything else for you today.")
    }

    return await stepContext.endDialog();
  }

  /**
   * Finalize the agent answer by invoking the selected tools and sending the answer to the user.
   * @param stepContext The waterfall step context
   * @param llmData the data to be passed to the agent
   * @returns The turn result
   */
  private async finalizeAgentAnswer(stepContext: WaterfallStepContext, llmData: IAgentStepData): Promise<void>  {
    
    const context: TurnContext = stepContext.context;

    const oboCredential = new OnBehalfOfUserCredential(llmData.ssoToken, oboAuthConfig);
    const authProvider = new TokenCredentialAuthenticationProvider(
        oboCredential,
        {
            scopes: [MicrosoftGraphScopes.TasksReadWrite, MicrosoftGraphScopes.SiteReadAll],
        }
    );

    // Data to be passed to tools
    const runnableConfig = {
      user_id: context.activity.from.aadObjectId,
      authProvider: authProvider,
      thread_id: context.activity.conversation!.id 
    };

    // Tools to be invoked by the agent
    const toolsByName = {
      [AgentTools.GetTasksForUsers]: getUserTasks,
      [AgentTools.GetTaskDetails]: getTaskDetails,
      [AgentTools.SearchTaskReferenceContent]: searchTaskReferenceContent,
      [AgentTools.SearchGeneralContent]: searchGeneralContent,
      [AgentTools.UpdateTaskCompletion]: updateTaskCompletion,
      [AgentTools.GetTaskStructuredOutput]: getTaskStructuredOutput,      
    };

    const messages: BaseMessage[] = [
     ...llmData.messages
    ];

    for (const toolCall of llmData.toolCalls) {
      const selectedTool = toolsByName[toolCall.name];
      let toolMessage = await selectedTool.invoke(toolCall, { configurable: runnableConfig })
      messages.push(toolMessage);
    }
    
    // Invoke all selected tools taking into account previous messages
    let llmResponse = await this.agent.invoke(
      { messages: messages },
      { configurable: runnableConfig }
    );

    // Special case where the getTaskStructuredOutput can be called after LLM reasoning based on previous tools output (GetTaskDetails + SearchTaskReferenceContent), for instance:
    // [ToolMessage]
    // [ToolMessage]
    // [AIMessage]
    // In that case, we invoke selected tools again to get the final answer
    // Ths is a specific to this solution for demo purpose. IDeally we would have to validate selected tools everytime and until there are none left.
    const toolCalls = llmResponse.messages[llmResponse.messages.length-1].tool_calls;
    
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const selectedTool = toolsByName[toolCall.name];
        let toolMessage = await selectedTool.invoke(toolCall, { configurable: runnableConfig })
        messages.push(toolMessage);
      }
  
      llmResponse = await this.agent.invoke(
        { messages: messages },
        { configurable: runnableConfig }
      );
    }

    await AnswerFormatHelper.formatAgentResponse(context, llmResponse);
  }

  public async onEndDialog(context: TurnContext) {
      const conversationId = context.activity.conversation.id;
      const currentDedupKeys = this.dedupStorageKeys.filter(
        (key) => key.indexOf(conversationId) > 0
      );
      await this.dedupStorage.delete(currentDedupKeys);
      this.dedupStorageKeys = this.dedupStorageKeys.filter(
        (key) => key.indexOf(conversationId) < 0
      );
  }

  //#endregion
  
  //#region Utility methods

  // If a user is signed into multiple Teams clients, the Bot might receive a "signin/tokenExchange" from each client.
  // Each token exchange request for a specific user login will have an identical activity.value.Id.
  // Only one of these token exchange requests should be processed by the bot.  For a distributed bot in production,
  // this requires a distributed storage to ensure only one token exchange is processed.
  public async shouldDedup(context: TurnContext): Promise<boolean> {

      const storeItem = {
          eTag: context.activity.value.id,
      };

      const key = this.getStorageKey(context);
      const storeItems = { [key]: storeItem };

      try {
          await this.dedupStorage.write(storeItems);
          this.dedupStorageKeys.push(key);
      } catch (err) {
          if (err instanceof Error && err.message.indexOf("eTag conflict")) {
              return true;
          }
          throw err;
      }
      return false;
  }

  private getStorageKey(context: TurnContext): string {
      if (!context || !context.activity || !context.activity.conversation) {
        throw new Error("Invalid context, can not get storage key!");
      }
      const activity = context.activity;
      const channelId = activity.channelId;
      const conversationId = activity.conversation.id;
      if (
        activity.type !== ActivityTypes.Invoke ||
        activity.name !== tokenExchangeOperationName
      ) {
        throw new Error(
          "TokenExchangeState can only be used with Invokes of signin/tokenExchange."
        );
      }
      const value = activity.value;
      if (!value || !value.id) {
        throw new Error(
          "Invalid signin/tokenExchange. Missing activity.value.id."
        );
      }
      return `${channelId}/${conversationId}/${value.id}`;
  }

  private getActivityText(activity: Activity): string {
      let text = activity.text;
      const removedMentionText = TurnContext.removeRecipientMention(activity);
      if (removedMentionText) {
        text = removedMentionText
          .toLowerCase()
          .replace(/\n|\r\n/g, "")
          .trim();
      }
      return text;
  }
  //#endregion
}