import { createSlice } from "@reduxjs/toolkit";

const roomSlice = createSlice({
  name: "rooms",
  initialState: {
    rooms: [],
    activeRoom: null,
  },
  reducers: {
    setRooms(state, action) {
      state.rooms = action.payload;
    },
    setActiveRoom(state, action) {
      state.activeRoom = action.payload;
    },
    addRoom(state, action) {
      state.rooms.push(action.payload);
    },
    deleteRoom(state, action) {
      state.rooms = state.rooms.filter((r) => r.id !== action.payload);
      if (state.activeRoom && state.activeRoom.id === action.payload) {
        state.activeRoom = null;
      }
    },
  },
});

export const { setRooms, setActiveRoom, addRoom, deleteRoom } = roomSlice.actions;
export default roomSlice.reducer;