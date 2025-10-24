/**
 * 
.----.   .--.  .-.   .-. .---. .----.   .--.  .-. .-..----..-.   
| {}  \ / {} \ |  `.'  |{_   _}| {}  } / {} \ | | | || {_  | |   
|     //  /\  \| |\ /| |  | |  | .-. \/  /\  \\ \_/ /| {__ | `--.
`----' `-'  `-'`-' ` `-'  `-'  `-' `-'`-'  `-' `---' `----'`----'
 * Firebase Functions Entry Point (Backend) 
 */

import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
logger.info("App Initialized...");

import { onUserCreate, onUserDelete, onUserModifyProfile } from "./user";
import {
    onLazyTripItemParsingRequest,
    onTripItemImageUpload,
} from "./comparison";

logger.info("Registering Functions...");

export {
    onUserCreate,
    onUserModifyProfile,
    onUserDelete,
    onLazyTripItemParsingRequest,
    onTripItemImageUpload,
};
