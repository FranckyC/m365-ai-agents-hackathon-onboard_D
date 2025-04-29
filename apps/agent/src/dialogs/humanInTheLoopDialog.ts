import { ComponentDialog, ConfirmPrompt, WaterfallDialog, WaterfallStepContext } from "botbuilder-dialogs";
import { IAgentStepData } from "./agentDialog";
import { ActivityTypes, CardFactory } from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { AIEntity } from "@microsoft/teams-ai/lib/types";
import ToolConfirmationMessageAdaptiveCard from "../cards/tools_confirmation.json";

const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

export class HumanInTheLoopDialog extends ComponentDialog {

    constructor(id: string) {
        super(id);
        
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.confirmToolUsageStep.bind(this),
            this.getConfirmationStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    private async confirmToolUsageStep(stepContext: WaterfallStepContext) {

        const modelData: IAgentStepData = stepContext.options as IAgentStepData;

        const card = AdaptiveCards.declare<any>(ToolConfirmationMessageAdaptiveCard).render({ 
            message: "Before proceeding, I need you to confirm the usage of following tool(s)", 
            data: modelData.toolCalls
        });
                
        const confirmationCard = {
            type: ActivityTypes.Message,
            attachments: [CardFactory.adaptiveCard(card)],
            entities: [
              {
                type: "https://schema.org/Message",
                "@type": "Message",
                "@context": "https://schema.org",
                "@id": "",
                additionalType: ["AIGeneratedContent"]
              },
            ] as AIEntity[],
        };
        
        return await stepContext.prompt(CONFIRM_PROMPT, confirmationCard);
    }

    private async getConfirmationStep(stepContext: WaterfallStepContext) {

        const userAnswer = stepContext.result;
        return await stepContext.endDialog({ userAnswer: userAnswer, modelData: stepContext.options});
    }
}