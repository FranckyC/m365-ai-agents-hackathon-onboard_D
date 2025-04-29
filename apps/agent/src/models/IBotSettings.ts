import { ConversationReference } from "botbuilder";

export interface IStorageTable {
    ETag: string;
}

export interface IBotSettingStorageValue<T> extends IStorageTable {
    value: T;
}

export interface IBotUserInfosStorageValue extends IBotSettingStorageValue<IUserInfo> {
}

/**
 * User information stored in the bot storage
 */
export interface IUserInfo {
    
    /**
     * The id of the user
     */
    id: string;

    /**
     * The AAD object id of the user
     */
    aadObjectId: string;

    /**
     * The name of the user
     */
    name: string,

    /**
     * The conversation reference of the user
     * This is used to send proactive messages to the user
     */
    conversationReference: Partial<ConversationReference>
}
