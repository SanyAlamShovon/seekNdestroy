var mongojs = require("mongojs");
var db = mongojs('localhost:27017/myGame', ['account','progress']);

//Starting server



var express = require('express');
var app = express();

app.set('port', process.env.PORT || 80);//setting port num

var server = require('http').Server(app);

server.listen( app.get('port'),function () {
	console.log("==== SERVER IS RUNNING ====");
});


//Providing HTML file to the clients

app.get('/',function (req, res) {
	res.sendFile(__dirname+'/client/index.html');
});

app.use('/client',express.static(__dirname+'/client'));


var SOCKET_LIST = {};

var Entity = function(){
	var self = {
		x:1250,
		y:626,
		spdX:0,
		spdY:0,
		id:"",

	}
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
	    self.x += self.spdX;
		self.y += self.spdY;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}

var Player = function(id,nm,scr,lvl){ ///////////////changed
	//console.log(lvl);
	var self = Entity();
	self.id = id;
	self.name = nm;           ///////////////////changed
	self.number = "" + Math.floor(10 * Math.random());
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.hp = 10;
	self.hpMax = 10;
	self.score = scr;
	self.level = lvl;
	self.frmState = 0;
	self.frmCount = 0;


	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();

		if(self.pressingAttack){
			self.shootBullet(self.mouseAngle);
		}
	}
	self.shootBullet = function(angle){
		var b = Bullet(self.id,angle);
		b.x = self.x;
		b.y = self.y;
	}

	self.updateSpd = function(){
		if(self.pressingRight) {
			self.spdX = self.maxSpd;
		}
		else if(self.pressingLeft) {
			self.spdX = -self.maxSpd;
		}
		else {
			self.spdX = 0;
		}

		if(self.pressingUp) {
			self.spdY = -self.maxSpd;
		}
		else if(self.pressingDown) {
			self.spdY = self.maxSpd;
		}
		else {
			self.spdY = 0;
		}
	}

	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number:self.number,
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
			level:self.level,
			frmState:self.frmState,
			frmCount:self.frmCount,
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
			level:self.level,
			frmState:self.frmState,
			frmCount:self.frmCount,
		}
	}

	Player.list[id] = self;

	initPack.player.push(self.getInitPack());
	return self;
}
Player.list = {};
Player.onConnect = function(socket,name,scr,lvl){
	//console.log(scr);
	//console.log(name);
	//console.log(lvl);
	var player = Player(socket.id,name,scr,lvl);

	socket.on('keyPress',function(data){
		if(data.inputId === 'left') {
			player.pressingLeft = data.state;
            if(!(player.x >=510)) player.pressingLeft = false;
			player.frmState = 2;
			if(player.frmCount === 8) player.frmCount=0;
			else player.frmCount++;
		}
		else if(data.inputId === 'right'){
			player.pressingRight = data.state;
            if(!(player.x <= 2000)) player.pressingRight = false;
			player.frmState = 3;
			if(player.frmCount === 8 || !player.pressingRight) player.frmCount=0;
			else player.frmCount++;
		}
		else if(data.inputId === 'up') {
			player.pressingUp = data.state;
            if(!(player.y>=335)) player.pressingUp = false;
			player.frmState = 1;
			if(player.frmCount === 8) player.frmCount=0;
			else player.frmCount++;
		}
		else if(data.inputId === 'down') {
			player.pressingDown = data.state;
            if(!(player.y<=910)) player.pressingDown=false;
			player.frmState = 0;
			if(player.frmCount === 8) player.frmCount=0;
			else player.frmCount++;
		}
		else if(data.inputId === 'attack')
			player.pressingAttack = data.state;
		else if(data.inputId === 'mouseAngle') {
			player.mouseAngle = data.state;
			var spX = Math.cos(data.state/180*Math.PI) * 10;
			var spY = Math.sin(data.state/180*Math.PI) * 10;
			var tmpx = spX;
			var tmpy = spY;
			if(spX<0) tmpx = spX*(-1);
			if(spY<0) tmpy = spY*(-1);
			if(tmpx>tmpy){
				if(spX<0)
					player.frmState = 2;
				else
					player.frmState = 3;
			} else {
				if(spY<0)
					player.frmState = 1;
				else
					player.frmState = 0;
			}
		}
	});

	socket.emit('init',{
		selfId:socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack(),
	})
}
Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}


var Bullet = function(parent,angle){
	var self = Entity();
	//self.colFire = false;
	self.id = Math.random();
	self.spdX = Math.cos(angle/180*Math.PI) * 10;
	self.spdY = Math.sin(angle/180*Math.PI) * 10;
	self.parent = parent;
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 100)
			self.toRemove = true;

		super_update();

		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 32 && self.parent !== p.id){
				p.hp -= 1;
				p.colFire = true;
				if(p.hp <= 0){
					var shooter = Player.list[self.parent];
					if(shooter) {
						shooter.score += 1;
						db.account.update(
							{ username: shooter.name },
							{ $inc: { score: +1 } }
						)
						if(shooter.score>19){
							db.account.update(
								{ username: shooter.name },
								{ $inc: { level: +1 } }
							)
							shooter.score=0;
							db.account.update(
								{ username: shooter.name },
								{ $set: { score: 0 } }
							)

							shooter.level+=1;
						}
					}
				//	shooter.length += 1;
					p.score -= 1;
					db.account.update(
						{ username: p.name },
						{ $inc: { score: -1 } }
					)
					p.hp = p.hpMax;
					p.x = 1250;
					p.y = 626;
				}
				self.toRemove = true;
			}
		}
	}
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			colFire: self.colFire
		};
	}
	self.getUpdatePack = function(){
		return {
			colFire: self.colFire,
			id:self.id,
			x:self.x,
			y:self.y,
		};
	}

	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.update = function(){
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove){
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());
	}
	return pack;
}

Bullet.getAllInitPack = function(){
	var bullets = [];
	for(var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}

var DEBUG = true;

var isValidPassword = function(data,cb){
	db.account.find({username:data.username,password:data.password},function(err,res){
		if(res.length > 0)
			cb(true);
		else
			cb(false);
	});
}
var isUsernameTaken = function(data,cb){
	db.account.find({username:data.username},function(err,res){
		if(res.length > 0)
			cb(true);
		else
			cb(false);
	});
}
var addUser = function(data,cb){
	db.account.insert({username:data.username,password:data.password,score:0,level:0},function(err){
		cb();
	});
}

var io = require('socket.io')(server,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	socket.on('signIn',function(data){
		var scr = 0;
		var lvl = 0;
		var advertisers = db.account.find({username:data.username});
		advertisers.forEach (function(err, doc){
			if(doc!=null)
				scr = doc.score;
			//console.log(scr + " in each loop");
		});
		var advertisers = db.account.find({username:data.username});
		advertisers.forEach (function(err, doc){
			if(doc!=null)
				lvl = doc.level;
		//	console.log(lvl + " in each loop");
		});
		isValidPassword(data,function(res){
			if(res){
			//	console.log(lvl + " after each loop");
				Player.onConnect(socket, data.username,scr,lvl);
				socket.emit('signInResponse',{success:true});
			} else {
				socket.emit('signInResponse',{success:false});
			}
		});
	});
	socket.on('signUp',function(data){
		isUsernameTaken(data,function(res){
			if(res){
				socket.emit('signUpResponse',{success:false});
			} else {
				addUser(data,function(){
					socket.emit('signUpResponse',{success:true});
				});
			}
		});
	});


	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	socket.on('sendMsgToServer',function(data){
		//var playerName = (" " + socket.id).slice(2,7);
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat', data);
		}
	});

	socket.on('evalServer',function(data){
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);
	});



});

var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};


setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update(),
	}

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack);
	}
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];

},1000/25);












