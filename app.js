'use strict';

var fs = require('fs');
var https = require('https');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var uuid = require('node-uuid').v4;
var LRU = require('lru-cache');
var cacheOptions = {
    max: 5000,
    maxAge: 1000 * 60 * 60 * 60 * 24 * 7
};
var cache = LRU(cacheOptions);

var ServerOptions = {
    key: fs.readFileSync(__dirname + '/server.key'),
    cert: fs.readFileSync(__dirname + '/server.crt'),
    requestCert: false,
    rejectUnauthorized: false
};
var server = https.createServer(ServerOptions, app);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/node_modules'));

app.get('/', function (req, res, next) {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(cache.dump()));
});

app.post('/connect', function (req, res, next) {
    var deviceId = req.body.deviceId;
    var userId = req.body.userId;
    var contentId = req.body.contentId;

    //Check if game already exists for this content, if yes, join it.
    var game = gameExistsForContent(contentId);
    if (game !== false) {
        res.send(joinGame(game.gameId, deviceId, userId, contentId));
    }
    //Else, create a new game and send the game Id
    else {
        res.send(createGame(deviceId, userId, contentId));
    }
});

app.get('/isReady/:gameId', function (req, res) {
    var gameId = req.params.gameId;
    if (gameExists(gameId)) {
        var gameData = cache.get(gameId);
        res.send(gameData.started);
    } else {
        res.sendStatus(404);
    }
});

app.post('/assess', function (req, res) {
    var gameId = req.body.gameId;
    var userId = req.body.userId;
    var quizData = req.body.quizData;

    if (gameExists(gameId)) {
        var gameData = cache.get(gameId);
        if (gameData.started === true) {
            var data = {
                userId: userId,
                data: quizData
            };
            gameData.quizData.push(data);
            cache.set(gameId, gameData);
            res.send(gameData);
        } else {
            res.sendStatus(404);
        }
    } else {
        res.sendStatus(404);
    }
});

app.get('/assess/:gameId', function (req, res) {
    var gameId = req.params.gameId;
    if (gameExists(gameId)) {
        res.send(cache.get(gameId));
    } else {
        res.sendStatus(404);
    }
});

var gameExistsForContent = function (contentId) {
    var gameFound = false;
    cache.forEach(function (value, key, cache) {
        if (value.contentId === contentId && value.started === false) {
            gameFound = value;
        }
    });
    return gameFound;
};

var gameExists = function (gameId) {
    return cache.has(gameId);
};

var createGame = function (deviceId, userId, contentId) {
    var gameId = uuid();
    var gameData = {
        gameId: gameId,
        contentId: contentId,
        users: [],
        started: false,
        quizData: []
    };
    gameData.users.push({
        deviceId: deviceId,
        userId: userId
    });

    cache.set(gameId, gameData);
    return gameId;
};

var joinGame = function (gameId, deviceId, userId, contentId) {
    var gameData = cache.get(gameId);
    gameData.users.push({
        deviceId: deviceId,
        userId: userId
    });
    gameData.started = true;

    cache.set(gameId, gameData);
    return gameId;
};

server.listen(7819, function () {
    console.log("Quiz-server started at port 7819!");
});