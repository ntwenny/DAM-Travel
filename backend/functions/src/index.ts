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

import {onUserCreate, onUserDelete, updateUser} from "./user";
import {onTripItemImageUpload} from "./comparison";
import {
  addTripItem,
  getTripItems,
  getTripItem,
  updateTripItem,
  createReceipt,
  createTrip,
  setCurrentTrip,
  deleteTrip,
  getTrips,
  addCartItem,
  removeCartItem,
  getCartItems,
  clearCart,
  updateCartItemQuantity,
  updateCartItemHomeTax,
} from "./trip";
import {
  getFinance,
  updateBudget,
  addCategory,
  deleteCategory,
  addTransaction,
  deleteTransaction,
  editTransaction,
} from "./finance";

logger.info("Registering Functions...");

export {
  onUserCreate,
  updateUser,
  onUserDelete,
  onTripItemImageUpload,
  addTripItem,
  getTripItems,
  getTripItem,
  updateTripItem,
  createTrip,
  setCurrentTrip,
  deleteTrip,
  createReceipt,
  getTrips,
  addCartItem,
  removeCartItem,
  getCartItems,
  clearCart,
  updateCartItemQuantity,
  getFinance,
  updateBudget,
  addCategory,
  deleteCategory,
  addTransaction,
  deleteTransaction,
  editTransaction,
  updateCartItemHomeTax,
};
