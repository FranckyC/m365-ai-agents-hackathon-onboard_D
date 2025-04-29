import { ConversationReference } from "botbuilder";

export interface IStorageTable {
    ETag: string;
}

export interface IBotSettingStorageValue<T> extends IStorageTable {
    value: T;
}

export interface IBotUserInfosStorageValue extends IBotSettingStorageValue<IUserInfo> {
}

export interface IUserInfo {
    id: string;
    aadObjectId: string;
    name: string,
    conversationReference: Partial<ConversationReference>
}
