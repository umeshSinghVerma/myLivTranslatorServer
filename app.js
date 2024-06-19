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
app.post('/translate', async (req, res) => {
    try {
        const body = await req.body;
        console.log("body",body);
        fetch("https://web-api.itranslateapp.com/v3/texts/translate", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en;q=0.9,hi;q=0.8,he;q=0.7",
                "Api-Key": "d2aefeac9dc661bc98eebd6cc12f0b82",
                "Content-Type": "application/json",
                "Origin": "https://itranslate.com",
                "Referer": "https://itranslate.com/",
                "Sec-Ch-Ua": "\"Google Chrome\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
                "Sec-Ch-Ua-Mobile": "?1",
                "Sec-Ch-Ua-Platform": "\"Android\"",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site",
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
            },
            body: JSON.stringify({
                source: {
                    dialect: body.currentLanguage,
                    text: body.message,
                    with: ["synonyms"]
                },
                target: {
                    dialect: body.targetLanguage
                }
            })
        })
            .then(response => response.json())
            .then((data) => {
                const translatedText = data.target.text;
                console.log("translated text",translatedText);
                res.send(translatedText).status(200);
            } 
            )
            .catch(error => {
                res.send("error",error).status(400)
                console.error('Error:', error)
            });


        // const translatedText = response.data.target.text;
        // res.send(translatedText).status(200);

    } catch (error) {
        console.log('error during translation ', error);
        res.send(error).status(400);
    }
})

io.on('connection', (socket) => {
    const username = socket.handshake.query.username;
    const imageUrl = socket.handshake.query.imageUrl;
    console.log("User Is Connected", username);
    console.log("User Is imageUrl", imageUrl);
    connectedUsers[socket.id] = { username, imageUrl };
    io.emit("users", connectedUsers);

    socket.on('sendMessage', async (data) => {
        console.log(data);
        io.to(data.to).emit('message', { user: connectedUsers[data.to], text: data.message, language: data.language });
    });

    socket.on('initiateCall', (callRequest) => {
        console.log('initiateCallRequest', callRequest);
        io.to(callRequest.recieverId).emit('initiateCall', {
            senderId: callRequest.senderId,
            senderUserName: callRequest.senderUserName,
            senderImage: callRequest.senderImage,
        })
    })

    socket.on('busy', (data) => {
        console.log('coming in busy')
        io.to(data.senderId).emit('busy', {})
    })

    socket.on('onGoingEndCall', (data) => {
        console.log('coming in onGoingEndCall')
        io.to(data.senderId).emit('onGoingEndCall', {})
    })

    socket.on('acceptcall', (data) => {
        console.log('coming in acceptcall')
        io.to(data.senderId).emit('acceptcall', {})
    })

    socket.on('endCall', (data) => {
        console.log('coming in endCall')
        io.to(data.senderId).emit('endCall', {})
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