var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000);

// Global variables for the server
var enemies = [];
var playerSpawnPoints = [];
var clients = [];

app.get('/', function(req, res) {
    res.send('Server is running');
});

io.on('connection', function(socket) {
    var currentPlayer = {
        name: 'unknown',
        position: { x: 0, y: 0, z: 0 }, // Initialize position
        rotation: { x: 0, y: 0, z: 0 }, // Initialize rotation
        health: 100,
        camera: {} // Initialize empty camera object
    };

    socket.on('player connect', function() {
        console.log(currentPlayer.name + ' recv: player connect');
        for (var i = 0; i < clients.length; i++) {
            var playerConnected = {
                name: clients[i].name,
                position: clients[i].position,
                rotation: clients[i].rotation,
                health: clients[i].health
            };
            // Emit information about other players to the newly connected player
            socket.emit('other player connected', playerConnected);
            console.log(currentPlayer.name + ' emit: other player connected: ' + JSON.stringify(playerConnected));
        }
    });

    socket.on('play', function(data) {
        console.log(currentPlayer.name + ' recv: play: ' + JSON.stringify(data));
        // Initialize enemies and spawn points if this is the first player joining
        if (clients.length === 0) {
            enemies = data.enemySpawnPoints.map(function(enemySpawnPoint) {
                return {
                    name: guid(),
                    position: enemySpawnPoint.position,
                    rotation: enemySpawnPoint.rotation,
                    health: 100
                };
            });

            playerSpawnPoints = data.playerSpawnPoints.map(function(_playerSpawnPoint) {
                return {
                    position: _playerSpawnPoint.position,
                    rotation: _playerSpawnPoint.rotation
                };
            });
        }

        // Send enemies data to the new player
        var enemiesResponse = { enemies: enemies };
        console.log(currentPlayer.name + ' emit: enemies: ' + JSON.stringify(enemiesResponse));
        socket.emit('enemies', enemiesResponse);

        // Assign a random spawn point to the current player
        var randomSpawnPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];
        currentPlayer.name = data.name;
        currentPlayer.position = randomSpawnPoint.position;
        currentPlayer.rotation = randomSpawnPoint.rotation;
        clients.push(currentPlayer);

        // Emit play event to the current player
        console.log(currentPlayer.name + ' emit: play: ' + JSON.stringify(currentPlayer));
        socket.emit('play', currentPlayer);

        // Broadcast to other players that a new player has connected
        socket.broadcast.emit('other player connected', currentPlayer);
    });

    socket.on('player move', function(data) {
        console.log(currentPlayer.name + ' recv: move: ' + JSON.stringify(data));
        currentPlayer.position = data.position;
        socket.broadcast.emit('player move', currentPlayer);
    });

    socket.on('player turn', function(data) {
        console.log(currentPlayer.name + ' recv: turn: ' + JSON.stringify(data));
        currentPlayer.rotation = data.rotation;
        socket.broadcast.emit('player turn', currentPlayer);
    });

    socket.on('player shoot', function() {
        console.log(currentPlayer.name + ' recv: shoot');
        var data = { name: currentPlayer.name };
        console.log(currentPlayer.name + ' bcst: shoot: ' + JSON.stringify(data));
        socket.emit('player shoot', data);
        socket.broadcast.emit('player shoot', data);
    });

    socket.on('health', function(data) {
        console.log(currentPlayer.name + ' recv: health: ' + JSON.stringify(data));
        // Only update health if the request is from the player itself
        if (data.from === currentPlayer.name) {
            var indexDamaged = 0;
            if (!data.isEnemy) {
                clients = clients.map(function(client, index) {
                    if (client.name === data.name) {
                        indexDamaged = index;
                        client.health -= data.healthChange;
                    }
                    return client;
                });
            } else {
                enemies = enemies.map(function(enemy, index) {
                    if (enemy.name === data.name) {
                        indexDamaged = index;
                        enemy.health -= data.healthChange;
                    }
                    return enemy;
                });
            }

            var response = {
                name: (!data.isEnemy) ? clients[indexDamaged].name : enemies[indexDamaged].name,
                health: (!data.isEnemy) ? clients[indexDamaged].health : enemies[indexDamaged].health
            };
            console.log(currentPlayer.name + ' bcst: health: ' + JSON.stringify(response));
            socket.emit('health', response);
            socket.broadcast.emit('health', response);
        }
    });

    socket.on('disconnect', function() {
        console.log(currentPlayer.name + ' recv: disconnect ' + currentPlayer.name);
        socket.broadcast.emit('other player disconnected', currentPlayer);
        console.log(currentPlayer.name + ' bcst: other player disconnected ' + JSON.stringify(currentPlayer));
        clients = clients.filter(function(client) {
            return client.name !== currentPlayer.name;
        });
    });

    socket.on('request camera', function() {
        // Assign a unique camera ID to the player
        currentPlayer.camera.id = guid();
        console.log(currentPlayer.name + ' recv: request camera, assigned camera ID: ' + currentPlayer.camera.id);

        // Emit the camera ID to the player
        socket.emit('assign camera', { id: currentPlayer.camera.id });
    });

    socket.on('update camera', function(data) {
        console.log(currentPlayer.name + ' recv: update camera: ' + JSON.stringify(data));
        // Update the camera position or rotation based on data received
        // Example: currentPlayer.camera.position = data.position;
        // Example: currentPlayer.camera.rotation = data.rotation;
        // Broadcast the updated camera data to other players
        socket.broadcast.emit('update camera', { playerId: currentPlayer.name, camera: data });
    });
});

console.log('--- Server is running ...');

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
