import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Button, KeyboardAvoidingView, TextInput, TouchableOpacity } from 'react-native';
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
import io from "socket.io-client";
import * as Crypto from 'expo-crypto';
import { WEBSOCKET_URL } from '@env'
import { socketWeb } from './socket';
import { peerConnection, dataChannel } from './rtcPeer.web';
import ChatApp from './ChatApp';

export default function App() {

  const [isConnected, setIsConnected] = useState(socketWeb.connected);

  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState(null);

  const [messages, setMessages] = useState([{}]);

  const [roomId, setRoomId] = useState("");
  const guid = useRef();


  useEffect(() => {

    guid.current = Crypto.randomUUID();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }


    socketWeb.on('connect', onConnect);
    socketWeb.on('disconnect', onDisconnect);

    return () => {
      socketWeb.off('connect', onConnect);
      socketWeb.off('disconnect', onDisconnect);
    };
  }, []);


  //SOCKET Listeners
  useEffect(() => {

    async function onSetLocalOffer(data) {
      console.log("setLocalOffer: " + JSON.stringify(data, 0, 4));
      const offerDescription = await peerConnection.createOffer();
      console.log("offerDesc: " + JSON.stringify(offerDescription));
      await peerConnection.setLocalDescription(offerDescription);

      socketWeb.to(data.roomId).emit("getLocalOffer", { offerSdp: offerDescription, roomId: data.roomId });
    }
    socketWeb.on("setLocalOffer", onSetLocalOffer);

    async function onSetRemoteAnswer(data) {
      console.log("SetRemoteAnswer: " + JSON.stringify(data, 0, 4));
      const offerDescription = new RTCSessionDescription(data.offerSdp);
      await peerConnection.setRemoteDescription(offerDescription);
      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      socketWeb.to(data.roomId).emit("getRemoteAnswer", { answerSdp: answerDescription, roomId: data.roomId });
    }
    socketWeb.on("setRemoteAnswer", onSetRemoteAnswer);


    async function onSetLocalAnswer(data) {
      console.log("SetLocalAnswer: " + JSON.stringify(data, 0, 4));
      const answerDescription = new RTCSessionDescription(data.answerSdp);
      await peerConnection.setRemoteDescription(answerDescription);
    }
    socketWeb.on("setLocalAnswer", onSetLocalAnswer);


    async function onGetICECandidates(data) {
      console.log("getICECandidates: " + JSON.stringify(data, 0, 4));
      peerConnection.addIceCandidate(data.candidate);
    }
    socketWeb.on("getICECandidates", onGetICECandidates);

    return () => {
      socketWeb.off("setLocalOffer", onSetLocalOffer);
      socketWeb.off("setRemoteAnswer", onSetRemoteAnswer);
      socketWeb.off("setLocalAnswer", onSetLocalAnswer);
      socketWeb.off("getICECandidates", onGetICECandidates);
    }
  }, []);





  //RTC Ontrack Event Listener
  useEffect(() => {
    peerConnection.ontrack = (e) => {
      // Grab the remote track from the connected participant.
      console.log("remoteStream");
      setRemoteMediaStream(e.streams[0]);
    }

  }, [remoteMediaStream]);


  //RTC Onmessage Event Listener
  useEffect(() => {
    peerConnection.onmessage = (e) => {
      console.log("message: " + JSON.stringify(e.data));
      setMessages([...messages, { message: e.data.message, owner: e.data.owner }]);
    }

    //DataChannel Event Listeners
    peerConnection.onopen = (e) => {
    }
    peerConnection.onclose = (e) => {
    }
  }, [messages]);


  //RTC Event Listeners
  useEffect(() => {
    peerConnection.onconnectionstatechange = (e) => {

    }
    peerConnection.onnegotiationneeded = (e) => {

    }
    peerConnection.onsignalingstatechange = (e) => {

    }

    peerConnection.ondatachannel = (e) => {
      dataChannel = e.channel;
    }

    //ICE Event Listeners
    peerConnection.onicecandidate = (e) => {
      console.log("candidate event: " + JSON.stringify(e.candidate));
      console.log("peerCon: " + JSON.stringify(peerConnection));
      if (e.candidate !== null) {
        console.log("here" + JSON.stringify(e));
        //Socket could be null call socket inside another func
        console.log("socket check: " + socketWeb);
        socketWeb.to(roomId).emit("exchangeICECandidates", { candidate: e.candidate, roomId: roomId });
      } else {
        console.log("candidate is null");
      }
    }
    peerConnection.onicecandidateerror = (e) => {

    }
    peerConnection.oniceconnectionstatechange = (e) => {

    }
    peerConnection.onicegatheringstatechange = (e) => {

    }
  }, []);

  return (
    <>
      <ChatApp guid={guid.current} roomId={roomId} setRoomId={setRoomId} localMediaStream={localMediaStream} setLocalMediaStream={setLocalMediaStream} remoteMediaStream={remoteMediaStream} messages={messages} ></ChatApp>
    </>
  );
}

const styles = StyleSheet.create({});