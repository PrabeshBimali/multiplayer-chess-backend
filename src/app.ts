import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors, { CorsOptions } from 'cors';
import createGameRoutes from './routers/createGameRoutes.js'

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

io.on("connection", (socket: Socket) => {
  console.log(`User with id: ${socket.id} connected`)
})

// Start the server
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});