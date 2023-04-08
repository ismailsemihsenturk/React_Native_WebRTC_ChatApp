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


export default function App() {

  const socket = useRef();
  const connectionConfig = {
    jsonp: false,
    reconnection: true,
    reconnectionDelay: 100,
    reconnectionAttempts: 100000,
    transports: ['websocket'],
  };
  socket.current = io(WEBSOCKET_URL, connectionConfig);

  const [roomId, setRoomId] = useState();
  const [myMessage, setMyMessage] = useState("");
  const [messages, setMessages] = useState([{}]);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [isCallCreated, setIsCallCreated] = useState(false);
  const [isCallJoined, setIsCallJoined] = useState(false);
  const scrollViewRef = useRef(ScrollView);
  const roomTextInputRef = useRef(TextInput);

  const guid = useRef();

  const cameraCount = useRef(0);
  const localMediaStream = useRef();
  const remoteMediaStream = useRef();
  const videoTrack = useRef(MediaStreamTrack);
  const peerConnection = useRef();
  const dataChannel = useRef();
  let isVoiceOnly = false;
  let isLocal = false;
  let isJoined = true;


  // Defining Media Constraints
  let mediaConstraints = {
    audio: true,
    video: {
      frameRate: 30,
      facingMode: 'user'
    }
  };

  // Defining Peer Constraints
  let peerConstraints = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  };

  // Defining Session Constraints
  let sessionConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true,
      VoiceActivityDetection: true
    }
  };

  // Start Peer Connection and Listen the events
  peerConnection.current = new RTCPeerConnection(peerConstraints);

  peerConnection.current.addEventListener('connectionstatechange', event => { });
  peerConnection.current.addEventListener('icecandidate', event => {
    if (event.candidate) {
      socket.current.emit("exchangeICECandidates", event.candidate);
    }
  });
  peerConnection.current.addEventListener('icecandidateerror', event => { });
  peerConnection.current.addEventListener('iceconnectionstatechange', event => { });
  peerConnection.current.addEventListener('icegatheringstatechange', event => { });
  peerConnection.current.addEventListener('negotiationneeded', event => { });
  peerConnection.current.addEventListener('signalingstatechange', event => { });
  peerConnection.current.addEventListener('track', event => {
    // Grab the remote track from the connected participant.
    remoteMediaStream.current = remoteMediaStream.current || new MediaStream();
    remoteMediaStream.current.addTrack(event.track, remoteMediaStream.current);
  });

  // Create Data Channel and Listen the events
  dataChannel.current = peerConnection.current.createDataChannel('my_channel');

  dataChannel.current.addEventListener('open', event => { });
  dataChannel.current.addEventListener('close', event => { });
  dataChannel.current.addEventListener('message', message => {
    setMessages([...messages, message]);
  });

  // This event is for the second client. Not the one who create the channel
  peerConnection.current.addEventListener('datachannel', event => {
    let datachannel = event.channel;

    // Now you've got the datachannel.
    // You can hookup and use the same events as above
    datachannel.send('Hey There!')
  });


  // Exchange ICE Candidates
  socket.current.on("getICECandidates", (candidate) => {
    peerConnection.current.addIceCandidate(candidate);
  });


  //Get Available Media Devices
  const createRoom = async () => {
    guid.current = Crypto.randomUUID();
    try {
      const devices = await mediaDevices.enumerateDevices();

      devices.map(device => {
        if (device.kind != 'videoinput') { return; };

        cameraCount.current = cameraCount.current + 1;
      });
    } catch (err) {
      // Handle Error
    };

    try {
      const mediaStream = await mediaDevices.getUserMedia(mediaConstraints);

      if (isVoiceOnly) {
        videoTrack.current = await mediaStream.getVideoTracks()[0];
        videoTrack.current.enabled = true;
      };

      localMediaStream.current = mediaStream;
      localMediaStream.current.getTracks().forEach(
        track => peerConnection.addTrack(track, localMediaStream)
      );



    } catch (err) {
      // Handle Error
    };

    setIsRoomCreated(!isRoomCreated);

  }

  // Initiate The Offer
  const startCall = async () => {
    isLocal = true;
    isJoined = false;
    let hostId = Crypto.randomUUID();
    roomTextInputRef.current.value = hostId;
    setRoomId(hostId);
    setIsCallCreated(!isCallCreated);

    const offerDescription = await peerConnection.current.createOffer();
    console.log("offer: " + JSON.stringify(offerDescription, 0, 4));
    await peerConnection.current.setLocalDescription(offerDescription);

    const offerSdp = {
      id: hostId,
      offer: {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      }
    };

    socket.current.emit("localOffer", offerSdp);
  };


  // Join the remote call
  const joinCall = async () => {
    // Get the offer from signaling server and answer it
    socket.current.emit("getLocalOffer", roomId);
    setIsCallJoined(!isCallJoined);
  };


  socket.current.on("localOfferForRemote", async (arg) => {
    const offerDescription = new RTCSessionDescription(arg.localOffer.offer);
    await peerConnection.current.setRemoteDescription(offerDescription);

    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.current.setLocalDescription(answerDescription);

    const offerSdp = {
      id: roomId,
      offer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      }
    };

    socket.current.emit("remote", offerSdp);
    socket.current.emit("getRemoteAnswerForLocal", "");
  });

  socket.current.on("remoteAnswerForLocal", async (arg) => {
    if (isLocal) {
      const offerDescription = new RTCSessionDescription(arg.localOffer.offer);
      await peerConnection.current.setRemoteDescription(offerDescription);
    }

  });



  // sendMessage via dataChannel
  const sendMessage = () => {
    const msg = {
      message: myMessage,
      owner: guid.current
    };

    setMessages([...messages, msg]);
    dataChannel.current.send(myMessage);
  };


  // After the call has finished 
  function callHasFinished() {
    localMediaStream.current.getTracks().forEach(
      track => track.stop()
    );

    localMediaStream.current = null;
    peerConnection.current.close();
    peerConnection.current = null;
    dataChannel.current.close();
    dataChannel.current = null;
    isLocal = false;
    isJoined = true;
  }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatButton}>
        {!localMediaStream.current && (
          <View style={styles.buttonItem}>
            <Button title="Click to start stream" onPress={() => createRoom()} />
          </View>
        )}
        {!isCallJoined && localMediaStream.current && (
          <View style={styles.buttonItem}>
            <Button
              title="Click to start call"
              onPress={() => startCall()}
              disabled={remoteMediaStream.current}
            />
          </View>
        )}
        {localMediaStream.current && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.roomWrapper}
          >
            <TextInput
              style={styles.roomInput}
              placeholder={"Room Id"}
              ref={roomTextInputRef}
              onChangeText={(text) => setRoomId(text)}
              value={roomId}
            />

            {!isCallCreated && localMediaStream.current && (
              <TouchableOpacity onPress={() => joinCall()}>
                <View>
                  <Text style={styles.roomWrapperButton}>Join Call</Text>
                </View>
              </TouchableOpacity>
            )}

          </KeyboardAvoidingView>
        )}
        {localMediaStream.current && remoteMediaStream.current && (
          <View style={styles.buttonItem}>
            <Button
              title="Click to stop call"
              onPress={callHasFinished()}
              disabled={!remoteMediaStream.current}
            />
          </View>
        )}
      </View>

      <View style={styles.rtcView}>
        {localMediaStream.current && (
          <RTCView
            style={styles.rtc}
            streamURL={localMediaStream.current.toURL()}
            mirror={true}
          />
        )}
      </View>
      <View style={styles.rtcView}>
        {remoteMediaStream.current && (
          <RTCView
            style={styles.rtc}
            streamURL={remoteMediaStream.current.toURL()}
            mirror={true}
          />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current.scrollToEnd({ animated: true })
        }
      >
        <View style={styles.chatBox}>
          <Text style={[styles.chatItems, styles.chatItemsSender]}>Deneme</Text>
          <Text style={[styles.chatItems, styles.chatItemsReceiver]}>
            Deneme
          </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme </Text>
          <Text style={[styles.chatItems]}> Deneme2 </Text>
        </View>
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.messageWrapper}
      >
        <TextInput
          style={styles.messageInput}
          placeholder={"Message"}
          onChangeText={(text) => setMyMessage(text)}
          value={myMessage}
        />
        <TouchableOpacity onPress={() => sendMessage()}>
          <View style={styles.messageWrapperButton}>
            <Text>+</Text>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
  },
  chatButton: {
    margin: 5,
    padding: 5,
    justifyContent: "space-evenly",
    display: "flex",
    flexDirection: "row",
  },
  buttonItem: {
    margin: 10,
  },
  text: {
    fontSize: 30,
  },
  rtcView: {
    justifyContent: "center",
    alignItems: "center",
    height: "30%",
    width: "80%",
    backgroundColor: "black",
  },
  rtc: {
    width: "80%",
    height: "100%",
  },
  scrollView: {
    position: "relative",
    backgroundColor: "black",
    marginHorizontal: 10,
    width: "100%",
    padding: 10,
    margin: 10,
    bottom: 55,
  },
  chatBox: {
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },
  chatItems: {
    borderRadius: 50,
    margin: 5,
    padding: 5,
    color: "white",
    flex: 1,
  },
  chatItemsSender: {
    position: "absolute",
    right: 0,
    backgroundColor: "red",
  },
  chatItemsReceiver: {
    position: "absolute",
    left: 0,
    backgroundColor: "blue",
  },
  roomInput: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: "#FFF",
    width: 150,
    borderColor: "#C0C0C0",
    borderWidth: 1,
  },
  messageInput: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#FFF",
    borderRadius: 60,
    width: 300,
    borderColor: "#C0C0C0",
    borderWidth: 1,
  },
  roomWrapperButton: {
    width: 60,
    height: 35,
    paddingVertical: 6,
    paddingHorizontal: 3,
    backgroundColor: "#2196F3",
    color: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  messageWrapperButton: {
    width: 60,
    height: 30,
    backgroundColor: "white",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C0C0C0",
  },
  roomWrapper: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  messageWrapper: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f2f0f0",
  },
});
