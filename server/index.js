const { WebSocketServer } = require("ws");
const { EventEmitter } = require("events");
const net = require('net');
const port = 7001;
const host = '0.0.0.0';

const information = new EventEmitter();

const server = net.createServer();
server.listen(port, host, () => {
    console.log(`listening rev on ${host}:${port}`);
});

let sockets = [];

server.on('connection', sock => {
    information.emit('connection', sock);
    console.log(`${sock.remoteAddress} smiled and decided to join with port ${sock.remotePort}`);
    sockets.push(sock);

    sock.on('data', data => {
        information.emit('data', sock, data);
        console.log(`${sock.remoteAddress} made a speech: ${data}`);
    });

    sock.on('close', () => {
        information.emit('close', sock);
        let index = sockets.findIndex(function(o) {
            return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
        console.log(`${sock.remoteAddress} was not amused enough`);
    })
});

const wssport = 7000;
const wss = new WebSocketServer({ port: wssport });
let websockets = [];

information.on('connection', (sock) => {
    websockets.forEach(ws => ws.send(JSON.stringify({id: 'connection', sock: {ip: sock.remoteAddress, port: sock.remotePort}})))
});

information.on('data', (sock, data) => {
    websockets.forEach(ws => ws.send(JSON.stringify({id: 'data', sock: {ip: sock.remoteAddress, port: sock.remotePort}, data: data})))
});

information.on('close', (sock) => {
    websockets.forEach(ws => ws.send(JSON.stringify({id: 'close', sock: {ip: sock.remoteAddress, port: sock.remotePort}})))
});

wss.on('listening', () => {
    console.log(`listening ws on 0.0.0.0:${wssport}`);
});

wss.on('connection', ws => {
    websockets.push(ws);
    let auth = false;
    ws.on('message', data => {
        try {
            let message = JSON.parse(data);
            switch(message.id) {
                case "auth":
                    if(message.key === "bhaejur(to outsmirk)") auth = true; else ws.close();
                case "command":
                    if(auth) {
                        let index = sockets.findIndex(function(o) {
                            return o.remoteAddress === message.sock.ip && o.remotePort === message.sock.port;
                        })
                        if(index !== -1) sockets[index].write(message.data);
                    } else {
                        ws.close();
                        return;
                    }
                default:
                    return
            }
        } catch(e) {
            ws.close();
        }
    });
});