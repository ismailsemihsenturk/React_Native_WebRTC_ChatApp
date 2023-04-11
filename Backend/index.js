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


let localSdp = {
    id: "",
    localOffer: {
        offer: {
            sdp: "",
            type: "",
        },

    },
    remoteOffer: {
        offer: {
            sdp: "",
            type: "",
        },
    },
};

let remoteSdp = {
    id: "",
    localOffer: {
        offer: {
            sdp: "",
            type: "",
        },

    },
    remoteOffer: {
        offer: {
            sdp: "",
            type: "",
        },
    },
};

// socket.emit 1v1
// socket.broadcast.emit 1 to many except itself
// io.sockets.emit every client

io.on("connection", (socket) => {
    console.log("hello world!")


    socket.on("localOffer", (offerSdp) => {
        localSdp.id = offerSdp.id;
        localSdp.localOffer = offerSdp.offer;
        console.log("localOffer: " + JSON.stringify(offerSdp, 0, 4));
    });

    socket.on("getLocalOffer", (roomId) => {
        if (localSdp.id === roomId) {
            socket.emit("localOfferForRemote", localSdp);
            console.log("localOfferForRemote:" + JSON.stringify(localSdp, 0, 4));
        }
    });

    socket.on("remote", (offerSdp) => {
        if (localSdp.id === offerSdp.id) {
            remoteSdp.id = offerSdp.id;
            remoteSdp.remoteOffer = localSdp.localOffer;
            remoteSdp.localOffer.offer = offerSdp.offer;
            localSdp.remoteOffer = remoteSdp.localOffer;
            socket.broadcast.emit("remoteAnswerForLocal", remoteSdp);
            console.log("remote: " + JSON.stringify(offerSdp, 0, 4));
            console.log("remoteAnswerForLocal:" + JSON.stringify(remoteSdp, 0, 4));
        }
    });

    socket.on("exchangeICECandidates", (candidate) => {
        console.log("remoteSDP check: " + JSON.stringify(remoteSdp, 0, 4));
        if (remoteSdp.localOffer.offer.sdp !== "") {
            io.sockets.emit("getICECandidates", candidate);
            //socket.emit("getICECandidates", candidate);
            console.log("getICECandidates:" + JSON.stringify(candidate, 0, 4));
        }
    });

    socket.on("messageHasArrived", (message) => {
        console.log("mesaj: " + message);
    });

})

server.listen(port, () => console.log("server running on port:" + port));