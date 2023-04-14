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

    socket.on("create", (room) => {
        socket.join(room);
    });

    socket.on("start", (arg) => {
        console.log("room: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.room).emit("setLocalOffer");
    });

    socket.on("getLocalOffer", (arg) => {
        console.log("getLocalOffer: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.room).emit("setRemoteAnswer", { offerSdp: arg.offerSdp, room: arg.room });
    });

    socket.on("getRemoteAnswer", (arg) => {
        console.log("getRemoteAnswer: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.room).emit("setLocalAnswer", { answerSdp: arg.offerSdp, room: arg.room });
    });

    socket.on("exchangeICECandidates", (arg) => {
        console.log("exchangeICECandidates: " + JSON.stringify(arg, 0, 4));
        socket.to(arg.room).emit("getICECandidates", { candidate: arg.candidate, room: arg.room });
    });

});

server.listen(port, () => console.log("server running on port:" + port));