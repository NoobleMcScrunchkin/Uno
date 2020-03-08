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

TODO
Stacking - Done!
7-0
Jump in - Done!
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
    @type("boolean")
    uno = false;
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
    waitingForChange = false;
    @type("boolean")
    waitingForSwap = false;
    @type({ map: Players })
    players = new MapSchema<Players>();
    @type("boolean")
    jumpIn = false;
    @type("boolean")
    sevenZero = false;
    @type("boolean")
    stacking = false;
    @type("boolean")
    contestable = false;
    @type("string")
    calledUno = "";
    @type("number")
    cardsToPick = 0;
    @type("number")
    stackPlayed = 0;
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
    time: any = new Date();
    unoCalled : boolean = false;
    cardSent : boolean = false;

    onCreate (options: any) {
        this.setState(new State(this));
        // console.log("UnoRoom created: " + this.roomId);
    }

    onJoin (client: Client, options: any) {
        if (!this.started) {
            // console.log("Player joined: " + client.id);
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
                    this.clockwise = true;
                    this.pickup = undefined;
                    this.block = undefined;
                    this.toBe = 0;
                    this.state.cardsToPick = 0;
                    this.state.stackPlayed = 0;
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
                    // console.log(this.playerCards);
                    this.state.turn = this.state.host;
                    // console.log("Game started");
                } else {
                    // console.log("Not enough players");
                }
            } else if (message.text != undefined) {
                // console.log(message.text);
            } else if (message.transfer != undefined ) {
                if (client.id == this.state.host) {
                    if (this.players[message.transfer] != undefined) {
                        // console.log("Host transfered to", message.transfer);
                        this.state.host = message.transfer;
                    } else {
                        // console.log("Transfer failed, player doesn't exist");
                    }
                } else {
                    // console.log("Non host tried to transfer");
                }
            } else if (message.playTurn != undefined && this.started && message.playTurn.colour != undefined && message.playTurn.number != undefined && !this.state.waitingForChange && !this.state.waitingForSwap && ((new Date().getTime() - this.time.getTime()) >= 500)) {
                if ((this.state.jumpIn && message.playTurn.number == this.state.currentCardNumber && message.playTurn.colour == this.state.currentCardColour || client.id == this.state.turn) && this.started) {
                    this.state.turn = client.id;
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
                            if ((this.state.cardsToPick == 0 && (message.playTurn.number > 12 || this.state.currentCardColour == message.playTurn.colour || this.state.currentCardNumber == message.playTurn.number)) || (this.state.cardsToPick > 0 && message.playTurn.number == this.state.stackPlayed)) {
                                if (this.state.contestable) {
                                    this.state.calledUno = "";
                                    this.state.contestable = false;
                                }
                                if (this.state.players[client.id].cards > 2) {
                                    this.unoCalled = false;
                                }
                                this.cardSent = false;
                                this.state.players[client.id].cards--;
                                this.playerCards[client.id].splice(index, 1);
                                if (this.state.players[client.id].cards == 1 && !this.unoCalled) {
                                    this.state.calledUno = client.id;
                                    this.state.contestable = true;
                                }
                                if (message.playTurn.number < 13) {
                                    this.state.currentCardColour =  message.playTurn.colour;
                                    this.state.currentCardNumber =  message.playTurn.number;
                                } else {
                                    this.toBe = message.playTurn.number;
                                }
                                this.time = new Date();
                                // console.log(this.state.turn, "played", message.playTurn.colour, message.playTurn.number);
                                if (this.state.players[client.id].cards == 0) {
                                    this.started = false;
                                    this.state.turn = "";
                                    for (let player in this.players) {
                                        this.state.players[player].cards = 7;
                                    }
                                    // console.log(client.id, "won")
                                    this.broadcast({winner: client.id})
                                } else {
                                    switch (message.playTurn.number) {
                                        case 0:
                                            if (this.state.sevenZero) {
                                                this.zeroSwap();
                                            }
                                            this.nextTurn(0, 0);
                                            break;
                                        case 7:
                                            if (this.state.sevenZero) {
                                                this.state.waitingForSwap = "true";
                                            }
                                            else {
                                                this.nextTurn(0, 0);
                                            }
                                            break;
                                        case 10:
                                            // console.log("Blocked");
                                            this.nextTurn(1, 0);
                                            break;
                                        case 11:
                                            // console.log("Reversed");
                                            if (this.clockwise) {
                                                this.clockwise = false;
                                            } else {
                                                this.clockwise = true;
                                            }
                                            this.nextTurn(0, 0);
                                            break;
                                        case 12:
                                            // console.log("+2");
                                            if (this.state.stacking) {
                                                this.state.cardsToPick += 2;
                                                this.state.stackPlayed = 12;
                                                this.nextTurn(0, 0);
                                            } else {
                                                this.nextTurn(1, 2);
                                            }
                                            break;
                                        case 13:
                                            // console.log("changeColour");
                                            this.state.waitingForChange = true;
                                            this.block = 0;
                                            this.pickup = 0;
                                            break;
                                        case 14:
                                            // console.log("+4");
                                            this.state.waitingForChange = true;
                                            if (this.state.stacking) {
                                                this.state.cardsToPick += 4;
                                                this.state.stackPlayed = 14;
                                            } else {
                                                this.block = 1;
                                                this.pickup = 4;
                                            }
                                            break;
                                        default:
                                            this.nextTurn(0, 0);
                                            break;
                                    }
                                }
                            } // else {
                                // console.log("Player cannot play that card");
                            // }
                        } // else {
                            // console.log("Player does not have the card they tried to play");
                        // }
                    } // else {
                        // console.log("Invalid turn played");
                    // }
                } // else {
                    // console.log("Player tried to play when it wasn't their turn");
                // }
            } else if (message.pickColour != undefined && this.started && this.state.waitingForChange && this.state.turn == client.id && !this.state.waitingForSwap) {
                if (message.pickColour == "r" || message.pickColour == "g" || message.pickColour == "b" || message.pickColour == "y") {
                    this.state.waitingForChange = false;
                    this.state.currentCardColour = message.pickColour;
                    this.state.currentCardNumber = this.toBe;
                    // console.log("Colour changed to", this.state.currentCardColour);
                    if (this.state.stacking) {
                        this.nextTurn(0, 0);
                    } else {
                        this.nextTurn(this.block, this.pickup);
                    }
                }
            } else if (message.pickup != undefined && message.pickup == true && !this.state.waitingForChange && this.started && !this.state.waitingForSwap) {
                if (this.state.turn == client.id) {
                    if (this.state.cardsToPick != 0 && this.state.stacking) {
                        // console.log(client.id, "picked up ", this.state.cardsToPick);
                        for (let i = 0; i < this.state.cardsToPick; i++) {
                            this.addCard(client.id);
                        }
                        this.state.cardsToPick = 0;
                    } else {
                        // console.log(client.id, "picked up");
                        this.addCard(client.id);
                    }
                    this.nextTurn(0, 0);
                } else {
                    // console.log("Player tried to play when it wasn't their turn");
                }
            } else if (message.pickSwap != undefined && this.state.waitingForSwap && client.id == this.state.turn && this.started && !this.state.waitingForChange && this.state.sevenZero) {
                if (this.players[message.pickSwap] != undefined && message.pickSwap != client.id) {
                    let temp = this.playerCards[client.id];
                    let tempC = this.state.players[client.id].cards;
                    this.playerCards[client.id] = this.playerCards[message.pickSwap];
                    this.state.players[client.id].cards = this.state.players[message.pickSwap].cards;
                    this.playerCards[message.pickSwap] = temp;
                    this.state.players[message.pickSwap].cards = tempC;
                    this.state.waitingForSwap = false;
                    this.nextTurn(0, 0);
                }
            } else if (message.stacking != undefined && (message.stacking == true || message.stacking == false) && client.id == this.state.host && !this.started) {
                this.state.stacking = message.stacking;
                // console.log(1);
            } else if (message.sevenZero != undefined && (message.sevenZero == true || message.sevenZero == false) && client.id == this.state.host && !this.started) {
                this.state.sevenZero = message.sevenZero;
                // console.log(1);
            } else if (message.jumpIn != undefined && (message.jumpIn == true || message.jumpIn == false) && client.id == this.state.host && !this.started) {
                this.state.jumpIn = message.jumpIn;
                // console.log(1);
            } else if (message.uno != undefined && (message.uno == true || message.uno == false) && client.id == this.state.turn && this.started && this.state.players[client.id].cards == 2) {
                this.unoCalled = true;
                this.state.players[client.id].uno = true;
                // console.log(1);
            } else if (message.contest != undefined && (message.contest == true || message.contest == false) && this.started && this.state.contestable) {
                this.state.contestable = false;
                this.addCard(this.state.calledUno);
                this.state.calledUno = "";
                this.unoCalled = false;
                console.log(1);
            } else if (message.playingCard != undefined && client.id == this.state.turn && !this.cardSent) {
                this.cardSent = true;
                this.broadcast({ cardPlayed: client.id });
            } else {
                // console.log(message);
                // console.log(new Date().getTime() - this.time.getTime());
                // this.time = new Date();
            }
        }
    }

    onLeave (client: Client, consented: boolean) {
        // console.log("Player left: " + client.id);
        delete this.players[client.id];
        delete this.state.players[client.id];

        if (client.id == this.state.turn) {
            this.nextTurn(0, 0);
        }

        try {
            if (client.id == this.state.host) {
                this.state.host = this.players[Object.keys(this.players)[0]].client.id;
                // console.log("Host left, new host is", this.state.host);
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
        // console.log("Room Destroyed");
    }

    zeroSwap() {
        if (!this.clockwise) {
            let temp = this.playerCards[Object.keys(this.players)[0]];
            let tempC = this.state.players[Object.keys(this.players)[0]].cards;
            for (let i = 0; i < Object.keys(this.players).length - 1; i++) {
                this.playerCards[Object.keys(this.players)[i]] = this.playerCards[Object.keys(this.players)[i + 1]];
                this.state.players[Object.keys(this.players)[i]].cards = this.state.players[Object.keys(this.players)[i + 1]].cards;
            }
            this.playerCards[Object.keys(this.players)[Object.keys(this.players).length - 1]] = temp;
            this.state.players[Object.keys(this.players)[Object.keys(this.players).length - 1]].cards = tempC;
        } else {
            let temp = this.playerCards[Object.keys(this.players)[Object.keys(this.players).length - 1]];
            let tempC = this.state.players[Object.keys(this.players)[Object.keys(this.players).length - 1]].cards;
            for (let i = Object.keys(this.players).length - 1; i > 0; i--) {
                this.playerCards[Object.keys(this.players)[i]] = this.playerCards[Object.keys(this.players)[i - 1]];
                this.state.players[Object.keys(this.players)[i]].cards = this.state.players[Object.keys(this.players)[i - 1]].cards;
            }
            this.playerCards[Object.keys(this.players)[0]] = temp;
            this.state.players[Object.keys(this.players)[0]].cards = tempC;
        }
    }

    addCard(player: string) {
        if (this.state.players[player].uno) {
            this.unoCalled = false;
            this.state.players[player].uno = false;
        }
        this.playerCards[player].push({colour: getColour(), number: getNumber(true)});
        this.state.players[player].cards++;
        this.send(this.players[player].client, { cards: this.playerCards[player]});
        // this.playerCards[player].push({colour: getColour(), number: 7});
        // console.log("cardPicked", player);
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
            // console.log("Current turn is", this.state.turn);
        } else {
            // console.log("playerId undefined");
        }
    }
}
