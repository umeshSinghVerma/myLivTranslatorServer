const express = require('express')
const { Server } = require('socket.io')
const { createServer } = require('http')
const cors = require('cors');
const { default: axios } = require('axios');

const port = process.env.PORT || 8080;

const app = express();
app.use(express.json());
app.use(cors());
const server = new createServer(app);
let connectedUsers = {};
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
    }
})
app.post('/translate', async(req, res) => {
    try {
        const body = await req.body;
        console.log('translate body ',body);
        const message = body.message;
        const targetLanguage = body.targetLanguage;
        const currentLanguage = body.currentLanguage;
        const response = await axios.post('https://dev-api.itranslate.com/translation/v2/', {
            source: {
                dialect: currentLanguage,
                text: message
            },
            target: {
                dialect: targetLanguage
            }
        }, {
            headers: {
                'Authorization': 'Bearer 603160b7-cee1-4c13-bcd7-37420b55211d',
                'Content-Type': 'application/json'
            }
        })
    
        const translatedText = response.data.target.text;
        res.send(translatedText).status(200);
        
    } catch (error) {
        console.log('error during translation ',error);
        res.send(error).status(400);
    }
})

io.on('connection', (socket) => {
    const username = socket.handshake.query.username;
    console.log("User Is Connected", username);
    connectedUsers[socket.id] = username;
    io.emit("users", connectedUsers);

    socket.on('sendMessage', async (data) => {
        console.log(data);
        io.to(data.to).emit('message', { user: connectedUsers[data.to], text: data.message, language: data.language });
    });

    socket.on('initiateCall',(callRequest)=>{
        console.log('initiateCallRequest',callRequest);
        io.to(callRequest.recieverId).emit('initiateCall',{
            senderId:callRequest.senderId,
            senderUserName:callRequest.senderUserName,
            senderImage:callRequest.senderImage,
        })
    })

    socket.on('busy',(data)=>{
        console.log('coming in busy')
        io.to(data.senderId).emit('busy',{})
    })

    socket.on('onGoingEndCall',(data)=>{
        console.log('coming in onGoingEndCall')
        io.to(data.senderId).emit('onGoingEndCall',{})
    })
    
    socket.on('acceptcall',(data)=>{
        console.log('coming in acceptcall')
        io.to(data.senderId).emit('acceptcall',{})
    })

    socket.on('endCall',(data)=>{
        console.log('coming in endCall')
        io.to(data.senderId).emit('endCall',{})
    })



    socket.on('disconnect', () => {
        console.log("User disconnected", socket.id)
        delete connectedUsers[socket.id];
        io.emit("users", connectedUsers);
    })

})

server.listen(port, () => {
    console.log("server is running on port ", port);
})