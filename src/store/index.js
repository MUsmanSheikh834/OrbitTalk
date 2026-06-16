import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import roomReducer from "./slices/roomSlice";
import chatReducer from "./slices/chatSlice";
import callReducer from "./slices/callSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomReducer,
    chat: chatReducer,
    call: callReducer,
  },
});