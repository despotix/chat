var net = require('net');

var client = new net.Socket();
client.connect(1337, '127.0.0.1', function() {
    console.log('Connected');
    let o = {msg:'Hello, server! Love, Bot.', name: 'Bot'+ process.pid};
    client.write(JSON.stringify(o));
});

client.on('data', function(data) {
    console.log('Received: ' + data);
    //client.destroy(); // kill client after server's response
});

client.on('close', function() {
    console.log('Connection closed');
});