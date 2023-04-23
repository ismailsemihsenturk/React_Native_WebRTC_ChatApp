const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const port = 3000;
const cors = require("cors");


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// const server = createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: "http://localhost:3000"
//     }
// });


io.sockets.on('connection', function (socket) {

    socket.on("create", (roomId) => {
        socket.join(roomId);
    });

    socket.on("start", (arg) => {
        console.log("roomId: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.roomId).emit("setLocalOffer", { roomId: arg.roomId });
    });

    socket.on("getLocalOffer", (arg) => {
        console.log("getLocalOffer: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.roomId).emit("setRemoteAnswer", { offerSdp: arg.offerSdp, roomId: arg.roomId });
    });

    socket.on("getRemoteAnswer", (arg) => {
        console.log("getRemoteAnswer: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.roomId).emit("setLocalAnswer", { answerSdp: arg.answerSdp, roomId: arg.roomId });
    });

    socket.on("exchangeICECandidates", (arg) => {
        console.log("exchangeICECandidates: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.roomId).emit("getICECandidates", { candidate: arg.candidate, roomId: arg.roomId });
    });

});

server.listen(port, () => console.log("server running on port:" + port));