import { MemoryStorage } from "botbuilder";
import { BlobsStorage } from "botbuilder-azure-blobs";
import { IBotUserInfosStorageValue} from "../models/IBotSettings";

/**
 * Helper class to manipulate bot storage
 */
export class StorageHelper {

    /**
     * Get the user information stored in the bot storage
     * @param storage the sotrage instance (MemoryStorage or BlobsStorage)
     * @param userId the user id to get the information for 
     * @returns the user information stored in the bot storage
     */
    public static async getUserInfos(storage: MemoryStorage | BlobsStorage, userId: string): Promise<Partial<IBotUserInfosStorageValue>> {

        let userStore = await storage.read([userId]);
        let userInfos: IBotUserInfosStorageValue = userStore[userId];
        if (userInfos != undefined && userInfos.value) {
            return (userStore[userId] as IBotUserInfosStorageValue);
        }
        
        return null;
    }
}