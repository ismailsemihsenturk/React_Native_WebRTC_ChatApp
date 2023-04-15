import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function Messenger(props) {
    return (
        <View style={styles.chatBox}>
            <Text style={[styles.chatItems, props.message.owner === props.guid ? styles.chatItemsSender : styles.chatItemsReceiver]}> {props.message.message}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
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
});