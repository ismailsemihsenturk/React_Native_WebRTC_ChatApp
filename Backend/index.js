import { Server } from "socket.io"
const port = 3000
const io = new Server(port);

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
        console.log(candidate);
    });

})