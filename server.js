var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    let workers = [...Array(numCPUs)].map( () => {
        let worker = cluster.fork();

        worker.on('message', (json) => {
            // do broadcast to all workers
            for(let w of workers) {
                w.send(json);
            }
            console.log(
                'Message from worker', process.pid,
                'received message from worker', worker.process.pid, '.',
                json
            );
        });

        return worker;
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log('worker ' + worker.process.pid + ' died');
    });

    cluster.on('death', (worker) => {
        console.log('Worker ' + worker.process.pid + ' died.');
    });
} else if (cluster.isWorker) {
    require('express')()
    .get('/', (req, res) => {
        res.sendFile(__dirname + '/index.html');
    })
    .listen(3000);

    let clients = [];

    // server side socket connections
    require('net')
    .createServer( (socket) => {
        clients.push(socket);
        let index = clients.indexOf(socket);
        let name = null;
        socket.on('data', (message) => {
            message = message.toString();
            if (!name) {
                name = JSON.parse(message).name;
            }
            process.send(Object.assign({index, pid: process.pid, message}));
        })
        .on('end', () => {
            clients.splice(clients.indexOf(socket), 1);
            let bye = JSON.stringify({name, msg : 'Client ' + name + ' has left'});
            process.send(Object.assign({index, pid: process.pid, message: bye}));
        })
        .on('error', (e) => {
            console.log(e);
        });
    })
    .listen(1337);

    // web-socket connections
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ port: 8080 });
    wss.on('connection', (ws) => {
        clients.push(ws);
        let index = clients.indexOf(ws);
        let name = null;
        ws.on('message', message => {
            message = message.toString();
            if (!name) {
                name = JSON.parse(message).name;
            }
            process.send(Object.assign({index, pid: process.pid, message}));
        }).on('close', function close() {
            clients.splice(index, 1);
            let bye = JSON.stringify({name, msg : 'Client ' + name + ' has left'});
            process.send(Object.assign({index, pid: process.pid, message: bye}));
        }).on('error', (e) => {
            console.log(e);
        });;
    });

    process.on('message', (json) => {
        for(let i in clients) {
            if (process.pid == json.pid) // todo remove check
                if (i == json.index) continue;
            console.log( 'msg from master', json);
            if(clients[i].write) clients[i].write(json.message);
            if(clients[i].send) clients[i].send(json.message);
        }
    });
}