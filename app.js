'use strict';

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var uuid = require('node-uuid').v4;
var LRU = require('lru-cache');
var cacheOptions = {
    max: 5000,
    maxAge: 1000 * 60 * 60 * 60 * 24 * 7
};
var cache = LRU(cacheOptions);

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/node_modules'));

app.get('/', function (req, res, next) {
    res.send(JSON.stringify(cache.dump()));
});

app.post('/connect', function (req, res, next) {
    var deviceId = req.deviceId;
    var userId = req.userId;
    var contentId = req.contentId;

    //Check if game already exists for this content
    if (gameExistsForContent(contentId)) {
        res.send('Game already exists');
    }
    //Else, create a new game and send the game Id
    else {
        res.send(createGame(deviceId, userId, contentId));
    }
});

var gameExistsForContent = function(contentId) {
    var gameFound = false;
    cache.forEach(function (value, key, cache) {
        console.log(value);
        if(value.contentId === contentId) {
            gameFound = true;
        }
    });
    return gameFound;
};

var gameExists = function (contentId) {
    return cache.has(gameId);
};

var createGame = function (deviceId, userId, contentId) {
    var gameId = uuid();
    var gameData = {
        gameId: gameId,
        contentId: contentId,
        users: [
            {
                deviceId: deviceId,
                userId: userId
            }
        ],
        started: false,
        quizData: []
    };

    cache.set(gameId, gameData);
    return gameId;
};

server.listen(7819);