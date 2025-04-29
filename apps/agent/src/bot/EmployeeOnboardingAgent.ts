import { Activity, ActivityTypes, ConversationState, MemoryStorage, Mention, StatePropertyAccessor, TeamsActivityHandler, TeamsInfo, TurnContext, UserState } from "botbuilder";
import { BlobsStorage } from "botbuilder-azure-blobs";
import { IBotUserInfosStorageValue } from "../models/IBotSettings";
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { AppCredential } from "@microsoft/teamsfx";
import { AgentTools, MicrosoftGraphScopes } from "../common/Constants";
import { AgentDialog} from "../dialogs/agentDialog";
import { appAuthConfig } from "../config";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { AnswerFormatHelper } from "../helpers/AnswerFormatHelper";
import { getUserTasks, getTaskDetails, updateTaskCompletion } from "../tools/plannerTools";
import { searchTaskReferenceContent } from "../tools/searchTools";

export class EmployeeOnboardingAgent extends TeamsActivityHandler {
    
    private _agent: any;

    //#region Storage containers

    private _userStorage: MemoryStorage | BlobsStorage;
    public get userStorage(): MemoryStorage | BlobsStorage {
        return this._userStorage;
    }

    public set userStorage(value: MemoryStorage | BlobsStorage) {
        this._userStorage = value;
    }

    private conversationState: ConversationState;
    private userState: UserState;
    private agentDialog: AgentDialog;
    private dialogState: StatePropertyAccessor;

    //#endregion
    
    constructor(agent: any) {
        super();

        const memoryStorage = new MemoryStorage();
        this._agent = agent;

        // Create conversation and user state with in-memory storage provider.
        this.conversationState = new ConversationState(memoryStorage);
        this.userState = new UserState(memoryStorage);
        this.agentDialog = new AgentDialog(memoryStorage, agent);
        this.dialogState = this.conversationState.createProperty("DialogState");
        
        this.onInstallationUpdateAdd(async (context, next) => {

            // Store user conversation reference on the first installation
            // IT will be used for proactive notifications
            let userStore = await this._userStorage.read([context.activity.from.aadObjectId]);

            userStore[context.activity.from.aadObjectId] = {
                value: {
                    id: context.activity.from.id,
                    aadObjectId: context.activity.from.aadObjectId,
                    name: context.activity.from.name,
                    conversationReference: TurnContext.getConversationReference(context.activity)
                }
            } as IBotUserInfosStorageValue
                        
            // Write to the store
            this._userStorage.write(userStore);
        });

        this.onMembersAdded(async (context, next) => {

            const membersAdded = context.activity.membersAdded;

            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {

                    const memberInfos = await TeamsInfo.getMember(context, member.aadObjectId);

                    // If we are in Microsoft Teams
                    if (context.activity.channelId === 'msteams') {

                        // Send a welcome message with an @Mention
                        const mention: Mention = {
                            mentioned: member,
                            text: `<at>${memberInfos.name}</at>`,
                            type: 'mention'
                        };

                        // Construct message to send
                        const message: Partial<Activity> = {
                            entities: [mention],
                            text: `Welcome aboard ${mention.text}!. My name is "On-Board-D", your new HR coach. I'll ping you from time to time to send you reminders along your onboading journey with us. In the meantime, feel free to ask me anything related to your tasks!`,
                            type: ActivityTypes.Message
                        };

                        await context.sendActivity(message);
                    }
                }
            }
        });

        this.onMessage(async (context, next) => {
            await this.agentDialog.run(context, this.dialogState);
            await next();
        });
    }

    public async run(context: TurnContext) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
        
    public async onSignInInvoke(context: TurnContext) {
        await this.agentDialog.run(context, this.dialogState);
    }

    /**
     * * Notify the user with a summary of his tasks
     * @param context The turn context of the Activity
     * @param userId The AAD Object ID of the user to notify
     */
    public async notifyTasksSummary(context: TurnContext, userId: string): Promise<void> {
        
        // Use application credentials as we don't have a user interaction
        const appCredential = new AppCredential(appAuthConfig);           
        const authProvider = new TokenCredentialAuthenticationProvider(appCredential, {
            scopes: [MicrosoftGraphScopes.Default],
        });

        // Get information about the current user according to its AAD ID
        const member = await TeamsInfo.getMember(context, userId);

        // Configuration to pass to LLM tools
        const runnableConfig = {
            user_id: context.activity.from.aadObjectId,
            authProvider: authProvider,
            thread_id: context.activity.conversation!.id 
        };

        const messages: BaseMessage[] =  [
            new SystemMessage(`Say hello to ${member.givenName} on your behalf before returning your answer. Indicates this is a friendly reminder on his onboarding journey.`),
            new HumanMessage("Get tasks for user")
        ];
        
        let llmResponse = await this._agent.invoke(
            { messages: messages },
            { configurable: runnableConfig }
        );
      
        // Because the agent is configured to stop before calling any tools, we need to execute them manually. Not need to confirm anything here as we already know the tool and expected output.
        const toolsByName = {
            [AgentTools.GetTasksForUsers]: getUserTasks,
            [AgentTools.GetTaskDetails]: getTaskDetails,
            [AgentTools.SearchTaskReferenceContent]: searchTaskReferenceContent,
            [AgentTools.UpdateTaskCompletion]: updateTaskCompletion
        };
    
        const toolCalls = llmResponse.messages[llmResponse.messages.length-1].tool_calls
    
        for (const toolCall of toolCalls) {
            const selectedTool = toolsByName[toolCall.name];
            let toolMessage = await selectedTool.invoke(toolCall, { configurable: runnableConfig })
            messages.push(toolMessage);
        }
        
        llmResponse = await this._agent.invoke(
            { messages: messages },
            { configurable: runnableConfig }
        );

        // Format the response to an adaptive card
        await AnswerFormatHelper.formatAgentResponse(context, llmResponse);
        
        return;
    }
}