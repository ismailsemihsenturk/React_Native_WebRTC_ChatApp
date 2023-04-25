import {
    ScreenCapturePickerView,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStream,
    MediaStreamTrack,
    mediaDevices,
    registerGlobals
} from 'react-native-webrtc-web-shim';

// Defining Media Constraints
export const mediaConstraints = {
    audio: true,
    video: {
        frameRate: 30,
        facingMode: 'user'
    }
};

// Defining Peer Constraints
export const peerConstraints = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

// Defining Session Constraints
export const sessionConstraints = {
    mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true,
        VoiceActivityDetection: true
    }
};

// Start Peer Connection
export const peerConnection = new RTCPeerConnection(peerConstraints);