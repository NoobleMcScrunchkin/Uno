import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { UnoRoom } from "./UnoRoom";
import path from "path";

const port = Number(process.env.PORT || 3214);
const app = express()

app.use(cors());
app.use(express.json())

const server = http.createServer(app);
const gameServer = new Server({
  server,
});

gameServer.define('unoRoom', UnoRoom);

app.use("/colyseus", monitor());

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/client/index.html'));
});

app.get('/index.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/client/index.js'));
});

app.get('/index.css', function(req, res) {
    res.sendFile(path.join(__dirname + '/client/index.css'));
});

app.get('/colyseus.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/client/colyseus.js'));
});

app.get('/card.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/client/card.png'));
});

app.get('/particles.min.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/client/particles.min.js'));
});

gameServer.listen(port);
console.log(`Listening on localhost:${ port }`)
