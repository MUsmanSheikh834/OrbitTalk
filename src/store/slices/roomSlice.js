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
  },
});

export const { setRooms, setActiveRoom, addRoom } = roomSlice.actions;
export default roomSlice.reducer;