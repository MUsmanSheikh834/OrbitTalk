import { createSlice } from "@reduxjs/toolkit";

const callSlice = createSlice({
  name: "call",
  initialState: {
    status: "idle", // idle | calling | incoming | active
    callType: null, // "audio" | "video"
    roomId: null,
    callerName: null,
    offer: null,
  },
  reducers: {
    startCall(state, action) {
      state.status = "calling";
      state.callType = action.payload.callType;
      state.roomId = action.payload.roomId;
    },
    incomingCall(state, action) {
      state.status = "incoming";
      state.callType = action.payload.callType;
      state.roomId = action.payload.roomId;
      state.callerName = action.payload.callerName;
      state.offer = action.payload.offer;
    },
    callAccepted(state) {
      state.status = "active";
    },
    endCall(state) {
      state.status = "idle";
      state.callType = null;
      state.roomId = null;
      state.callerName = null;
      state.offer = null;
    },
  },
});

export const { startCall, incomingCall, callAccepted, endCall } =
  callSlice.actions;
export default callSlice.reducer;
