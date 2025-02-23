const express = require('express');
const https = require("https");
const socketIo = require('socket.io');
const cors = require('cors')
const fs = require('fs')

const options = {
    key: fs.readFileSync('./key.pem'), // Path to private key
    cert: fs.readFileSync('./cert.pem'), // Path to certificate
};

const app = express();
const server = https.createServer(options, app);

const users = {}
const messages = {}

function genChat(u1, u2) {
    return [u1, u2].sort().join('-')
}


const io = socketIo(server, {
    cors: {
        origin: ["https://192.168.31.190:3000", "https://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: ["https://192.168.31.190:3000", "https://localhost:3000"],
    credentials: true
}));


app.get('/', (req, res) => {
    res.send("server is up running")
})

io.on('connection', (socket) => {

    socket.emit('id', socket.id)

    socket.on('register', (name) => {
        users[socket.id] = name
        io.emit('user_joined', Object.entries(users).map(([id, name]) => ({ id, name })))
    })

    socket.on('get_messages', (msg) => {
        const chatId = genChat(socket.id, msg.to)
        if (!messages[chatId]) {
            messages[chatId] = []
        }
        socket.emit('message', messages[chatId])
    })

    socket.on('send_messages', (msg) => {
        const chatId = genChat(socket.id, msg.to)
        if (messages[chatId]) {
            messages[chatId].push(msg)
            socket.emit('message', messages[chatId]);
            io.to(msg.to).emit('message', messages[chatId]);
        }
    })


    // audio call

    // Handle offer
    socket.on('offer', (data) => {
        const { offer, to } = data;
        io.to(to).emit('offer', { offer, from: socket.id });
    });

    // Handle answer
    socket.on('answer', (data) => {
        const { answer, to } = data;
        io.to(to).emit('answer', { answer, from: socket.id });
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        const { candidate, to } = data;
        io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });



    socket.on('disconnect', () => {
        if (!users[socket.id]) {
            return null
        }
        delete users[socket.id]

        io.emit('user_joined', Object.entries(users).map(([id, name]) => ({ id, name })))
    })
})

server.listen(3001)



