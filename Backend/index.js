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



io.on("connection", (socket) => {
    console.log("hello world!")


    socket.on("localOffer", (offerSdp) => {
        console.log(offerSdp);
        localSdp.id = offerSdp.id;
        localSdp.localOffer = offerSdp.offer;
        console.log(offerSdp);
    });

    socket.on("getLocalOffer", (roomId) => {
        if (localSdp.id === roomId) {
            socket.emit("localOfferForRemote", localSdp);
        }
    });

    socket.on("remote", (offerSdp) => {
        if (localSdp.id === offerSdp.id) {
            remoteSdp.id = offerSdp.id;
            remoteSdp.remoteOffer = localSdp.localOffer;
            remoteSdp.localOffer = offerSdp.offer;
            localSdp.remoteOffer = remoteSdp.localOffer;
            console.log(offerSdp);
        }
    });

    socket.on("getRemoteAnswerForLocal", (arg) => {
        socket.emit("remoteAnswerForLocal", remoteSdp);
    });

    socket.on("exchangeICECandidates", (candidate) => {
        socket.emit("getICECandidates", candidate);
        console.log("geldi");
    });

})

server.listen(port, () => console.log("server running on port:" + port));