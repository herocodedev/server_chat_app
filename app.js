require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;

const cors = require("cors");
app.use(cors());

const socketio = require("socket.io");
const http = require("http");
const server = http.createServer(app);
const io = socketio(server);

// Router
const router = require("./router");
app.use(router);

// handle socket io
const { getUser, getUsersInRoom, addUser, removeUser } = require("./users");
io.on("connection", (socket) => {
  console.log("A user connected");

  // Listening event from client
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to the room ${user.room}`,
    });

    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name},has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    socket.join(user.room);
    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
    console.log("A user disconnected");
  });
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
