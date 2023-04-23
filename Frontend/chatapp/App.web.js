import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Button, KeyboardAvoidingView, TextInput, TouchableOpacity, Platform } from 'react-native';
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
import * as Crypto from 'expo-crypto';
import { WEBSOCKET_URL } from '@env'
import { socket } from './socket.web';
import { peerConnection, dataChannel } from './rtcPeer.web';
import ChatApp from './ChatApp.web';
import { Buffer } from "buffer";



export default function App() {

  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const guid = useRef();
  const chatAppRef = useRef()

  //SOCKET LISTENER CALLBACKS
  async function onSetLocalOffer(data) {
    console.log("setLocalOffer: " + JSON.stringify(data, 0, 4));
    const offerDescription = await peerConnection.createOffer();
    console.log("offerDesc: " + JSON.stringify(offerDescription));
    await peerConnection.setLocalDescription(offerDescription);

    socket.emit("getLocalOffer", { offerSdp: offerDescription, roomId: data.roomId });
  }
  async function onSetRemoteAnswer(data) {
    console.log("SetRemoteAnswer: " + JSON.stringify(data, 0, 4));
    const offerDescription = new RTCSessionDescription(data.offerSdp);
    await peerConnection.setRemoteDescription(offerDescription);
    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    socket.emit("getRemoteAnswer", { answerSdp: answerDescription, roomId: data.roomId });
  }
  async function onSetLocalAnswer(data) {
    console.log("SetLocalAnswer: " + JSON.stringify(data, 0, 4));
    const answerDescription = new RTCSessionDescription(data.answerSdp);
    await peerConnection.setRemoteDescription(answerDescription);
  }
  async function onGetICECandidates(data) {
    console.log("getICECandidates: " + JSON.stringify(data, 0, 4));
    peerConnection.addIceCandidate(data.candidate);
  }


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
      console.log("web on track");
      // Grab the remote track from the connected participant.
      chatAppRef.current.setPeerStream(e.streams[0])
    }
  }, []);


  //RTC Onmessage Event Listener
  useEffect(() => {
    dataChannel.onmessage = (e) => {
      let temp = JSON.parse(e.data.toString());
      chatAppRef.current.setPeerMessage(temp);

    }

    //DataChannel Event Listeners
    dataChannel.onopen = (e) => {
    }
    dataChannel.onclose = (e) => {
    }
  }, []);


  //RTC Event Listeners
  useEffect(() => {
    peerConnection.onconnectionstatechange = (e) => {

    }
    peerConnection.onnegotiationneeded = (e) => {

    }
    peerConnection.onsignalingstatechange = (e) => {

    }

    peerConnection.ondatachannel = (e) => {
      console.log("channel id: " + e.channel.id);
      console.log("data channel is ready");
    }

    //ICE Event Listeners
    peerConnection.onicecandidate = (e) => {
      if (e.candidate !== null) {
        socket.emit("exchangeICECandidates", { candidate: e.candidate, roomId: roomId });
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
      <ChatApp guid={guid.current} roomId={roomId} setRoomId={setRoomId} ref={chatAppRef}></ChatApp>
    </>
  );
}

const styles = StyleSheet.create({});