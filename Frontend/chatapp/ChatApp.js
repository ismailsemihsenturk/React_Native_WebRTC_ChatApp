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
import { peerConnection, dataChannel, mediaConstraints } from './rtcPeer';
import Messenger from './Messenger';


export default function ChatApp(props) {

    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const [isCallCreated, setIsCallCreated] = useState(false);
    const [isCallJoined, setIsCallJoined] = useState(false);
    const [joinId, setJoinId] = useState();
    const [videoTrack, setVideoTrack] = useState(null);

    const [myMessage, setMyMessage] = useState("");

    const scrollViewRef = useRef(ScrollView);
    const roomTextInputRef = useRef(TextInput);

    const cameraCount = useRef(0);
    let isVoiceOnly = false;

    //Get Available Media Devices
    const createRoom = async () => {
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
                let videoTrackObj = await mediaStream.getVideoTracks()[0];
                setVideoTrack(videoTrackObj);
                videoTrack.enabled = true;
            };

            props.setLocalMediaStream(mediaStream);
            props.localMediaStream.getTracks().forEach(
                track => peerConnection.addTrack(track, props.localMediaStream)
            );

        } catch (err) {
            // Handle Error
        };
        setIsRoomCreated(!isRoomCreated);
    }

    // Initiate The Call
    const startCall = () => {
        let randomRoomId = Crypto.randomUUID();
        roomTextInputRef.current.value = randomRoomId;
        props.setRoomId(randomRoomId);
        setJoinId(randomRoomId);
        setIsCallCreated(!isCallCreated);
        socket.emit("create", randomRoomId);

    };


    // Join The Remote Call
    const joinCall = async () => {
        setIsCallJoined(!isCallJoined);
        // Get the offer from signaling server and answer it 
        socket.emit("create", joinId);
        socket.emit("start", { roomId: joinId });
    };

    // sendMessage via dataChannel
    const sendMessage = () => {
        console.log("mesage send");
        const msg = {
            message: myMessage,
            owner: props.guid
        };
        dataChannel.send(msg);
    };

    // After the call has finished 
    function callHasFinished() {
        props.localMediaStream.getTracks().forEach(
            track => track.stop()
        );

        props.localMediaStream = null;
        peerConnection.close();
        peerConnection = null;
        dataChannel.close();
        dataChannel = null;
        setIsCallCreated(!isCallCreated);
        setIsCallJoined(!isCallJoined);
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.chatButton}>
                {!props.localMediaStream && (
                    <View style={styles.buttonItem}>
                        <Button title="Click to start stream" onPress={() => createRoom()} />
                    </View>
                )}
                {!isCallJoined && props.localMediaStream && (
                    <View style={styles.buttonItem}>
                        <Button
                            title="Click to start call"
                            onPress={() => startCall()}
                            disabled={props.remoteMediaStream}
                        />
                    </View>
                )}
                {props.localMediaStream && (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.roomWrapper}
                    >
                        <TextInput
                            style={styles.roomInput}
                            placeholder={"Room Id"}
                            ref={roomTextInputRef}
                            onChangeText={(text) => setJoinId(text)}
                            value={joinId}
                        />

                        {!isCallCreated && props.localMediaStream && (
                            <TouchableOpacity onPress={() => joinCall()}>
                                <View>
                                    <Text style={styles.roomWrapperButton}>Join Call</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                    </KeyboardAvoidingView>
                )}
                {props.localMediaStream && props.remoteMediaStream && (
                    <View style={styles.buttonItem}>
                        <Button
                            title="Click to stop call"
                            onPress={() => callHasFinished()}
                            disabled={!props.remoteMediaStream}
                        />
                    </View>
                )}
            </View>

            <View style={styles.rtcView}>
                {props.localMediaStream && (
                    <RTCView
                        style={styles.rtc}
                        streamURL={props.localMediaStream.toURL()}
                        mirror={true}
                    />
                )}
            </View>
            <View style={styles.rtcView}>
                {props.remoteMediaStream && (
                    <RTCView
                        style={styles.rtc}
                        streamURL={props.remoteMediaStream.toURL()}
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

                {props.messages.map((message, index) => {
                    return (
                        <Messenger message={message} key={index} guid={props.guid} />
                    );
                })}

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
    )
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
