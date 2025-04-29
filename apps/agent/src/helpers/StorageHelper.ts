import { MemoryStorage } from "botbuilder";
import { BlobsStorage } from "botbuilder-azure-blobs";
import { IBotUserInfosStorageValue} from "../models/IBotSettings";

export class StorageHelper {

    public static async getUserInfos(storage: MemoryStorage | BlobsStorage, userId: string): Promise<Partial<IBotUserInfosStorageValue>> {

        let userStore = await storage.read([userId]);
        let userInfos: IBotUserInfosStorageValue = userStore[userId];
        if (userInfos != undefined && userInfos.value) {
            return (userStore[userId] as IBotUserInfosStorageValue);
        }
        
        return null;
    }
}