import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

/*
0 : 0
1 : 1
2 : 2
3 : 3
4 : 4
5 : 5
6 : 6
7 : 7
8 : 8
9 : 9
10: block
11: reverse
12: + 2
13: changeColour
14: + 4
*/

function randomIntFromInterval(min : number, max : number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNumber(mod : boolean) {
    let num = 0;
    if (mod) {
        num = randomIntFromInterval(0, 26);
    } else {
        num = randomIntFromInterval(0, 18);
    }
    if (num < 25) {
        return Math.ceil(num / 2);
    } else {
        switch (num) {
            case 25:
                return 13;
                break;
            case 26:
                return 14;
                break;
        }
    }
}

function getColour() {
    let colourInt = randomIntFromInterval(0, 3);
    let colour = "";
    switch (colourInt) {
        case 0:
            colour = "r";
            break;
        case 1:
            colour = "g";
            break;
        case 2:
            colour = "b";
            break;
        case 3:
            colour = "y";
            break;
    }
    return colour;
}

export class Players extends Schema {
    @type("string")
    name = "";
    @type("number")
    cards = 7;
}

export class State extends Schema {
    @type("string")
    host = "";
    @type("string")
    currentCardColour = "";
    @type("number")
    currentCardNumber = 0;
    @type("string")
    turn = "";
    @type("boolean")
    waitingForChange = false
    @type({ map: Players })
    players = new MapSchema<Players>();
}

export class UnoRoom extends Room {
    maxClients : number = 8;
    players : any = {};
    clockwise : boolean = true;
    started : boolean = false;
    playerCards : any = {};
    pickup : any = undefined;
    block : any = undefined;
    toBe : number = 0;

    onCreate (options: any) {
        this.setState(new State(this));
        console.log("UnoRoom created: " + this.roomId);
    }

    onJoin (client: Client, options: any) {
        if (!this.started) {
            console.log("Player joined: " + client.id);
            if (this.state.host == "") {
                this.state.host = client.id;
            }
            if (options.name != undefined) {
                this.players[client.id] = {name: options.name, client: client};
            } else {
                this.players[client.id] = {name: "Player", client: client};
            }
            this.state.players[client.id] = new Players()
            this.state.players[client.id].name = this.players[client.id].name;
            this.state.players[client.id].cards = 7;
        } else {
            client.close();
        }
    }

    onMessage (client: Client, message: any) {
        if (message != undefined) {
            if (message.start != undefined && !this.started && client.id == this.state.host) {
                if (Object.keys(this.players).length > 1) {
                    this.started = true;
                    this.state.currentCardColour =  getColour();
                    this.state.currentCardNumber =  getNumber(false);
                    for (let player in this.players) {
                        this.playerCards[player] = [];
                        for (let i = 0; i < 7; i++) {
                            this.addCard(player);
                        }
                        this.state.players[player].cards = 7;
                        this.send(this.players[player].client, { cards: this.playerCards[player] });
                    }
                    console.log(this.playerCards);
                    this.state.turn = this.state.host;
                    console.log("Game started");
                } else {
                    console.log("Not enough players");
                }
            } else if (message.text != undefined) {
                console.log(message.text);
            } else if (message.transfer != undefined ) {
                if (client.id == this.state.host) {
                    if (this.players[message.transfer] != undefined) {
                        console.log("Host transfered to", message.transfer);
                        this.state.host = message.transfer;
                    } else {
                        console.log("Transfer failed, player doesn't exist");
                    }
                } else {
                    console.log("Non host tried to transfer");
                }
            } else if (message.playTurn != undefined && this.started && message.playTurn.colour != undefined && message.playTurn.number != undefined && !this.state.waitingForChange) {
                if (client.id == this.state.turn && this.started) {
                    if ((message.playTurn.colour == "r" || message.playTurn.colour == "g" || message.playTurn.colour == "b" || message.playTurn.colour == "y") && message.playTurn.number > -1 && message.playTurn.number < 15) {
                        let valid = false;
                        let index = undefined;
                        for (let i = 0; i < this.playerCards[client.id].length; i++) {
                            if (this.playerCards[client.id][i].colour == message.playTurn.colour && this.playerCards[client.id][i].number == message.playTurn.number) {
                                valid = true;
                                index = i;
                                break;
                            }
                        }
                        if (valid) {
                            if (message.playTurn.number > 12 || this.state.currentCardColour == message.playTurn.colour || this.state.currentCardNumber == message.playTurn.number) {
                                this.state.players[client.id].cards--;
                                this.playerCards[client.id].splice(index, 1);
                                if (message.playTurn.number < 13) {
                                    this.state.currentCardColour =  message.playTurn.colour;
                                    this.state.currentCardNumber =  message.playTurn.number;
                                } else {
                                    this.toBe = message.playTurn.number;
                                }
                                console.log(this.state.turn, "played", message.playTurn.colour, message.playTurn.number);
                                if (this.state.players[client.id].cards == 0) {
                                    this.started = false;
                                    this.state.turn = "";
                                    for (let player in this.players) {
                                        this.state.players[player].cards = 7;
                                    }
                                    console.log(client.id, "won")
                                    this.broadcast({winner: client.id})
                                } else {
                                    if (message.playTurn.number > 9) {
                                        switch (message.playTurn.number) {
                                            case 10:
                                                console.log("Blocked");
                                                this.nextTurn(1, 0);
                                                break;
                                            case 11:
                                                console.log("Reversed");
                                                if (this.clockwise) {
                                                    this.clockwise = false;
                                                } else {
                                                    this.clockwise = true;
                                                }
                                                this.nextTurn(0, 0);
                                                break;
                                            case 12:
                                                console.log("+2");
                                                this.nextTurn(1, 2);
                                                break;
                                            case 13:
                                                console.log("changeColour");
                                                this.state.waitingForChange = true;
                                                this.block = 0;
                                                this.pickup = 0;
                                                break;
                                            case 14:
                                                console.log("+4");
                                                this.state.waitingForChange = true;
                                                this.block = 1;
                                                this.pickup = 4;
                                                break;
                                        }
                                    } else {
                                        this.nextTurn(0, 0);
                                    }
                                }
                            } else {
                                console.log("Player cannot play that card");
                            }
                        } else {
                            console.log("Player does not have the card they tried to play");
                        }
                    } else {
                        console.log("Invalid turn played");
                    }
                } else {
                    console.log("Player tried to play when it wasn't their turn");
                }
            } else if (message.pickColour != undefined && this.started && this.state.waitingForChange && this.state.turn == client.id) {
                if (message.pickColour == "r" || message.pickColour == "g" || message.pickColour == "b" || message.pickColour == "y") {
                    this.state.waitingForChange = false;
                    this.state.currentCardColour = message.pickColour;
                    this.state.currentCardNumber = this.toBe;
                    console.log("Colour changed to", this.state.currentCardColour);
                    this.nextTurn(this.block, this.pickup);
                }
            } else if (message.pickup != undefined && message.pickup == true && !this.state.waitingForChange && this.started) {
                if (this.state.turn == client.id) {
                    console.log(client.id, "picked up");
                    this.addCard(client.id);
                    this.nextTurn(0, 0);
                } else {
                    console.log("Player tried to play when it wasn't their turn");
                }
            } else {
                console.log(message);
            }
        }
    }

    onLeave (client: Client, consented: boolean) {
        console.log("Player left: " + client.id);
        delete this.players[client.id];
        delete this.state.players[client.id];

        if (client.id == this.state.turn) {
            this.nextTurn(0, 0);
        }

        try {
            if (client.id == this.state.host) {
                this.state.host = this.players[Object.keys(this.players)[0]].client.id;
                console.log("Host left, new host is", this.state.host);
            }
        } catch {}

        if (Object.keys(this.players).length < 2) {
            this.started = false;
            this.state.turn = "";
            for (let player in this.players) {
                this.state.players[player].cards = 7;
            }
        }
    }

    onDispose() {
        console.log("Room Destroyed");
    }

    addCard(player: string) {
        this.state.players[player].cards++;
        this.playerCards[player].push({colour: getColour(), number: getNumber(true)});
        console.log("cardPicked", player);
    }

    nextTurn(block: any, pickup: any) {
        let playerId = undefined;
        for (let i = 0; i < Object.keys(this.players).length; i++) {
            if (this.state.turn == this.players[Object.keys(this.players)[i]].client.id) {
                playerId = i;
                break;
            }
        }
        if (playerId != undefined) {
            if (this.clockwise) {
                playerId++;
                if (pickup != 0) {
                    if (playerId > Object.keys(this.players).length - 1) {
                        playerId -= Object.keys(this.players).length;
                    }
                    for (let i = 0; i < pickup; i++) {
                        this.addCard(this.players[Object.keys(this.players)[playerId]].client.id);
                    }
                }
                if (block != 0) {
                    playerId++;
                }
                if (playerId > Object.keys(this.players).length - 1) {
                    playerId -= Object.keys(this.players).length;
                }
            } else {
                playerId--;
                if (pickup != 0) {
                    if (playerId < 0) {
                        playerId += Object.keys(this.players).length;
                    }
                    for (let i = 0; i < pickup; i++) {
                        this.addCard(this.players[Object.keys(this.players)[playerId]].client.id);
                    }
                }
                if (block != 0) {
                    playerId--;
                }
                if (playerId < 0) {
                    playerId += Object.keys(this.players).length;
                }
            }
            this.state.turn = this.players[Object.keys(this.players)[playerId]].client.id;
            for (let player in this.players) {
                this.send(this.players[player].client, { cards: this.playerCards[player] });
            }
            console.log("Current turn is", this.state.turn);
        } else {
            console.log("playerId undefined");
        }
    }
}
