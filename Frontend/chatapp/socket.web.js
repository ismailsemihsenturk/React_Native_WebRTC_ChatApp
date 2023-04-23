import { io } from 'socket.io-client';
import { WEBSOCKET_URL } from '@env'

const connectionConfig = {
    jsonp: false,
    reconnection: true,
    reconnectionDelay: 100,
    reconnectionAttempts: 100000,
    transports: ['websocket'],
};
export const socket = io("localhost:3000", connectionConfig);
// export const socketWeb = io(WEBSOCKET_URL, connectionConfig);