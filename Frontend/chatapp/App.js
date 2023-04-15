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
} from 'react-native-webrtc';
import io from "socket.io-client";
import * as Crypto from 'expo-crypto';
import { WEBSOCKET_URL } from '@env'
import { socket } from './socket';
import { peerConnection, dataChannel } from './rtcPeer';
import ChatApp from './ChatApp';

export default function App() {

  const [isConnected, setIsConnected] = useState(socket.connected);

  const [localMediaStream, setLocalMediaStream] = useState(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState(null);
  const [videoTrack, setVideoTrack] = useState(null);

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


    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);


  //SOCKET Listeners
  useEffect(() => {

    async function onSetLocalOffer(arg) {
      console.log("setLocalOffer: " + JSON.stringify(arg, 0, 4));

      const offerDescription = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offerDescription);

      socket.to(arg.roomId).emit("getLocalOffer", { offerSdp: offerDescription, roomId: arg.roomId });
    }

    async function onSetRemoteAnswer(arg) {
      console.log("SetRemoteAnswer: " + JSON.stringify(arg, 0, 4));

      const offerDescription = new RTCSessionDescription(arg.offerSdp);
      await peerConnection.setRemoteDescription(offerDescription);
      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      socket.to(arg.roomId).emit("getRemoteAnswer", { answerSdp: answerDescription, roomId: arg.roomId });
    }

    async function onSetLocalAnswer(arg) {
      console.log("SetLocalAnswer: " + JSON.stringify(arg, 0, 4));

      const answerDescription = new RTCSessionDescription(arg.answerSdp);
      await peerConnection.setRemoteDescription(answerDescription);
    }

    function onGetICECandidates(arg) {
      console.log("getICECandidates: " + JSON.stringify(arg, 0, 4));
      peerConnection.addIceCandidate(arg.candidate);
    }



    socket.on("setLocalOffer", onSetLocalOffer);
    socket.on("setRemoteAnswer", onSetRemoteAnswer);
    socket.on("setLocalAnswer", onSetLocalAnswer);
    socket.on("getICECandidates", onGetICECandidates);
    return () => {
      socket.off("setLocalOffer", onSetLocalOffer);
      socket.off("setRemoteAnswer", onSetRemoteAnswer);
      socket.off("setLocalAnswer", onSetLocalAnswer);
      socket.off("getICECandidates", onGetICECandidates);
    }
  }, []);





  //RTC Ontrack Event Listener
  useEffect(() => {
    peerConnection.ontrack = (e) => {
      // Grab the remote track from the connected participant.
      console.log("remoteStream");
      setRemoteMediaStream(e.streams[0]);
    }
    return () => {
    }
  }, [remoteMediaStream]);


  //RTC Onmessage Event Listener
  useEffect(() => {
    peerConnection.onmessage = (e) => {
      console.log("message: " + JSON.stringify(e.data));
      setMessages([...messages, { message: e.data.message, owner: e.data.owner }]);
    }

    return () => {

    }
  }, [messages]);


  useEffect(() => {
    //RTC Event Listeners
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
      if (e.candidate) {
        socket.to(roomId).emit("exchangeICECandidates", { candidate: e.candidate, roomId: roomId });
      }
    }
    peerConnection.onicecandidateerror = (e) => {

    }
    peerConnection.oniceconnectionstatechange = (e) => {

    }
    peerConnection.onicegatheringstatechange = (e) => {

    }

    //DataChannel Event Listeners
    peerConnection.onopen = (e) => {
    }
    peerConnection.onclose = (e) => {
    }

    return () => {
    }
  }, []);

  return (
    <>
      <ChatApp guid={guid.current} roomId={roomId} setRoomId={setRoomId} localMediaStream={localMediaStream} setLocalMediaStream={setLocalMediaStream} remoteMediaStream={remoteMediaStream} videoTrack={videoTrack} messages={messages} ></ChatApp>
    </>
  );
}

const styles = StyleSheet.create({});