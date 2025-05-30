import { ActivityTypes, CardFactory, TurnContext } from "botbuilder";
import { AIEntity } from "@microsoft/teams-ai/lib/types";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { AdaptiveCard } from "@microsoft/teams-ai/lib/AdaptiveCards";
import { findLastIndex } from "lodash";
import NotificationMessageAdaptiveCard from "../cards/reminder_notification.json";
import TaskDetailsAdaptiveCard from "../cards/task_details.json";
import { AgentTools } from "../common/Constants";

/**
 * Helper class to format the response from the LLM and send it to the user
 */
export class AnswerFormatHelper {

    /**
     * * Format the response from the LLM and send it to the user
     * @param context The turn context
     * @param llmResponse The response from the LLM
     * @returns {Promise<void>} A promise that resolves when the message is sent
     */
    public static async formatAgentResponse(context: TurnContext, llmResponse: any): Promise<void> {

        // Use the raw text answer from the LLM
        const llmResponseContent = llmResponse.messages[llmResponse.messages.length - 1].content as string;
        let card = undefined;
    
        // Determine the last tool called by the LLM
        const lastIndex = findLastIndex(llmResponse.messages, (e) => { 
            return e.getType() == 'tool'; 
        });
    
        if (lastIndex > -1) {
            // If the last message is a tool call, we need to format the response according to the tool called. For specific tools, we use he artifact data to pass it diretly to adaptive card.
            switch (llmResponse.messages[lastIndex].name) {

                case AgentTools.GetTasksForUsers:
                    card = AdaptiveCards.declare<any>(NotificationMessageAdaptiveCard).render({ answer: llmResponseContent, data: llmResponse.messages[lastIndex].artifact}); 
                    await this.sendAIGeneratedAdaptiveCard(context, card);   
                    break;
    
                case AgentTools.GetTaskDetails:
                    card = AdaptiveCards.declare<any>(TaskDetailsAdaptiveCard).render({ data: llmResponse.messages[lastIndex].artifact});
                    await this.sendAIGeneratedAdaptiveCard(context, card);
                    break;
    
                case AgentTools.GetTaskStructuredOutput:
                    card = AdaptiveCards.declare<any>(TaskDetailsAdaptiveCard).render({ answer: null, data:  llmResponse.messages[lastIndex].artifact });
                    await this.sendAIGeneratedAdaptiveCard(context, card);
                    break;
                        
                default:
                    // Regular text output
                    await context.sendActivity(llmResponseContent);
                    break;
            }
        } else {
            // Regular text output
            await context.sendActivity(llmResponseContent);
        }
    }

    public static async sendAIGeneratedAdaptiveCard(context: TurnContext, adaptiveCard: AdaptiveCard) {

        await context.sendActivity({
            type: ActivityTypes.Message,
            attachments: [CardFactory.adaptiveCard(adaptiveCard)],
            entities: [
              {
                type: "https://schema.org/Message",
                "@type": "Message",
                "@context": "https://schema.org",
                "@id": "",
                additionalType: ["AIGeneratedContent"]
              },
            ] as AIEntity[],
          });
    }
}