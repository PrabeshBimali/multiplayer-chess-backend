import dotenv from "dotenv"
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors, { CorsOptions } from 'cors';
import createGameRoutes from './routers/createGameRoutes.js'
import joinNewGameRoutes from './routers/joinNewGameRoutes.js'
import stateRoutes from './routers/stateRoutes.js'
import chatRoutes from "./routers/chatRouters.js"
import registerSocketEventHandlers from './socket/registerSocketEventHandlers.js'
import { APIRateLimit } from './middlewares/rateLimit.js';

const dotenvResult = dotenv.config()

if(dotenvResult.error) {
  throw dotenvResult.error
}

const corsOptions: CorsOptions = {
  origin: process.env.FRONTEND_URL
}

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

app.use("/create-game", APIRateLimit, createGameRoutes)
app.use("/join-new-game", joinNewGameRoutes)
app.use("/state", stateRoutes)
app.use("/chat", chatRoutes)

io.on("connection", async (socket: Socket) => {
  console.log(`User with id: ${socket.id} connected`)
  await registerSocketEventHandlers(socket, io)
})

// Start the server
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});