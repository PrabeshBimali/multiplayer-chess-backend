import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors, { CorsOptions } from 'cors';
import createGameRoutes from './routers/createGameRoutes.js'
import joinNewGameRoutes from './routers/joinNewGameRoutes.js'
import stateRoutes from './routers/stateRoutes.js'
import registerSocketEventHandlers from './socket/registerSocketEventHandlers.js'


const corsOptions: CorsOptions = {
  origin: "http://localhost:3000"
}

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use("/create-game", createGameRoutes)
app.use("/join-new-game", joinNewGameRoutes)
app.use("/state", stateRoutes)

io.on("connection", async (socket: Socket) => {
  console.log(`User with id: ${socket.id} connected`)
  await registerSocketEventHandlers(socket, io)
})

// Start the server
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});