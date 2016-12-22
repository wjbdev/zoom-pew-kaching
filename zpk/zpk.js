//Use db object as if it was a MVC repo
var Database = require("./data/database.js");
var db = new Database();

//Fetch serverside game classes
var Entity = require('./entities/entity.js');
var Player = require('./entities/player.js');
var Station = require('./entities/station.js');
var Projectile = require('./entities/projectile.js');
var Wormhole = require('./entities/wormhole.js');
var Team = require('./entities/team.js');
var Planet = require('./entities/planet.js');
var Enemy = require('./entities/enemy.js');
//All packs should be defined in below file
var Pack = require('./data/pack.js');

//Standard nodejs setup
var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/pub/index.html');
});
app.use('/pub',express.static(__dirname + '/pub'));
serv.listen(process.env.PORT || 3001);

console.log("Server started.");

var socketList = {};

//Fetch permanent entities from db
db.getSystems();
//db.getStations();
new Planet('Planet One', 1800, 350, 0, 0, 0.0002, 'testy');
new Planet('Planet Two', 1100, 150, 0, 0, 0.0005, 'testy');
var stA = new Station('Station A', -650, -650, 'testy');
var stB = new Station('Station B', 500, 200, 'qwe');
for(var st in Station.list) {
	Station.list[st].storage.contents = db.getItems();

	db.getWeapons(function(r) {
		if(r) {
			for(var i in r) {
				stA.storage.contents[i] = r[i];
				stA.storage.contents[i].amount = 999;
				stB.storage.contents[i] = r[i];
				stB.storage.contents[i].amount = 999;
			}
		}
	});
}
new Wormhole('WormholeB', 150, -450, 'qwe', 'testy');
new Wormhole('WormholeC', 0, -700, 'testy', 'qwe');
var safe = new Team('players', true);
var pirates = new Team('pirates', true);
//new Enemy();

//db.getDrones
//db.getOtherStuff etc

//Anything to do with receiving + sending packs to clients
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	var d = new Date(); // for now
	console.log("[" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "] Client " + socket.id + " connected.");
	socketList[socket.id] = socket;

	socket.on('loginRequest', function(user) {
		db.isPasswordValid(user, function(r) {
			if(r && user.username.length >= 3) {
				db.getPlayer(user, function(savedData) {
					if(savedData != null) {
						Player.onConnect(socket, savedData);

						for(var u in socketList) {
							socketList[u].emit('serverMessage', '(' + Player.list[socket.id].name + ') has connected.');
						}
					}
				});
				socket.emit('loginResponse', {success: true});

			}
			else {
				socket.emit('loginResponse', {success: false});
			}
		});
	});
	socket.on('regRequest', function(user) {
		db.isUserTaken(user, function(r) {
			if(r) {
				socket.emit('regResponse', {success: false});
			}
			else {
				db.newUser(user, function(){
					socket.emit('regResponse', {success: true});
				});
			}
		})
	});
	socket.on('disconnect',function(){
		if(Player.list[socket.id] != undefined) {
			for(var u in socketList) {
				socketList[u].emit('serverMessage', '(' + Player.list[socket.id].name + ') has left the game.');
			}
		}
		Player.onDisconnect(socket);

		delete socketList[socket.id];
	});

	socket.on('respawnRequest', function(userId) {
		Player.list[userId].respawn();
	});

	//Relay chat back to clients
	socket.on('clientMessage', function(message) {
		if(message == '/red') {
			//Player.list[socket.id].setRed();
			return;
		}
		for(var u in socketList) {
			socketList[u].emit('serverMessage', '(' + Player.list[socket.id].name + ')' + message);
		}
	})
});

//25?FPS loop
setInterval(function(){

	var updatePack = {
		players: Player.update(),
		projectiles: Projectile.update(),
		stations: Station.update(),
		wormholes: Wormhole.update(),
		teams: Team.update(),
		planets: Planet.update(),
		enemies: Enemy.update()
	};

	for(var s in socketList){
		var sock = socketList[s];
		sock.emit('initPack', Pack.initPack);
		sock.emit('updatePack', updatePack);
		if(Pack.delPack.players.length > 0 || Pack.delPack.projectiles.length > 0)
			sock.emit('delPack', Pack.delPack);
	}

	Pack.initPack.players = [];
	Pack.initPack.projectiles = [];
	Pack.initPack.stations = [];
	Pack.initPack.wormholes = [];
	Pack.initPack.teams = [];
	Pack.initPack.planets = [];
	Pack.initPack.enemies = [];

	Pack.delPack.players = [];
	Pack.delPack.projectiles = [];
	Pack.delPack.enemies = [];

},1000/30);

process.on('SIGINT', function() {
	console.log('Saving players..');

	for(var player in Player.list)
		db.savePlayer(Player.list[player]);


	console.log('Shutting down..');
	setTimeout(()=> {
		process.exit();
	}, 5000);
});