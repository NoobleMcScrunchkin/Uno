var client = new Colyseus.Client('ws://' + location.host + ':3214');
var room = undefined;
var myCards = [];
var winner = undefined;

$(window, document, undefined).ready(function() {
    $('input').blur(function() {
        var $this = $(this);
        if ($this.val())
        $this.addClass('used');
        else
        $this.removeClass('used');
    });
    var $ripples = $('.ripples');
    $ripples.on('click.Ripples', function(e) {
        var $this = $(this);
        var $offset = $this.parent().offset();
        var $circle = $this.find('.ripplesCircle');
        var x = e.pageX - $offset.left;
        var y = e.pageY - $offset.top;
        $circle.css({
            top: y + 'px',
            left: x + 'px'
        });
        $this.addClass('is-active');
    });
    $ripples.on('animationend webkitAnimationEnd mozAnimationEnd oanimationend MSAnimationEnd', function(e) {
             $(this).removeClass('is-active');
     });
});

window.onload = function() {
    Particles.init({
        selector: '.background',
        color: "#ffffff",
        connectParticles: true
    });
}

function join() {
    if (room == undefined) {
        let name = document.getElementById("nameInp").value;
        if (!name.replace(/\s/g, '').length) {
            name = "Player";
        }
        let id = document.getElementById("roomInp").value;
        joinRoom(name, id);
    }
}

function joinRoom(name, id) {
    if (room == undefined) {
        if (!id.replace(/\s/g, '').length) {
            client.create("unoRoom", { name: name }).then(room => {runGame(room)}).catch(e => {
                console.error("join error", e);
            });
        } else {
            client.joinById(id, { name: name }).then(room => {runGame(room)}).catch(e => {
                console.error("join error (Game may have started)", e);
            });
        }
    }
}

function runGame(roomP) {
    room = roomP
    console.log("joined successfully", room.sessionId, room.id);

    document.getElementsByTagName("body")[0].className = "game";
    document.getElementById("entry").hidden = true;
    document.getElementById("game").hidden = false;

    room.onMessage((message) => {
        if (message.cards != undefined) {
            myCards = message.cards;
            winner = undefined;
            console.log(myCards);
        } else if (message.winner != undefined) {
            winner = message.winner;
            console.log(message.winner, "won")
        } else {
            console.log(message);
        }
    });

    room.onStateChange((state) => draw());
}

function draw() {
    $("#players").empty();
    dom = document.createElement("span");
    dom.textContent = "Room ID: ";
    document.getElementById("players").appendChild(dom);
    indom = document.createElement("span");
    indom.className = "forceSelect";
    indom.textContent = room.id;
    dom.appendChild(indom);
    document.getElementById("players").appendChild(document.createElement("br"));
    for (let player in room.state.players) {
        div = document.createElement("div");
        div.className = "tooltip"
        document.getElementById("players").appendChild(div);
        dom = document.createElement("span");
        if (room.state.turn == player) {
            dom.style.color = "red";
        }
        dom.textContent = room.state.players[player].name;
        if (room.state.host == player) {
            dom.textContent += " (Host)"
        }
        if (winner != undefined && room.state.turn == "" && winner == player) {
            dom.textContent += " (Winner)"
        }
        div.appendChild(dom);
        if (room.sessionId == room.state.host && player != room.state.host) {
            div.setAttribute("onclick","transferHost('" + player + "')");
            tip = document.createElement("span");
            tip.className = "tooltiptext";
            tip.textContent = "Click to transfer host";
            tip.style.left = (-dom.offsetWidth) + "px";
            div.appendChild(tip);
        }
        document.getElementById("players").appendChild(document.createElement("br"));
        div = document.createElement("div")
        div.className = "cards";
        document.getElementById("players").appendChild(div);
        for (let i = 0; i < room.state.players[player].cards; i++){
            dom = document.createElement("img");
            dom.src = "cards/card.png"
            dom.className = "card"
            div.appendChild(dom);
        }
    }
    if (room.state.turn != "") {
        document.getElementById("startB").style.display = "none";
        document.getElementById("currentCard").src = "cards/" + room.state.currentCardColour + room.state.currentCardNumber + ".png";
        $("#gameArea .cards").empty();
        for (let i = 0; i < myCards.length; i++) {
            dom = document.createElement("img");
            if (myCards[i].number < 13) {
                dom.src = "cards/" + myCards[i].colour + myCards[i].number + ".png";
            } else {
                dom.src = "cards/" + myCards[i].number + ".png";
            }
            dom.setAttribute("onclick","playCard('" + myCards[i].colour + "', " + myCards[i].number + ")");
            dom.className = "card";
            document.getElementById("gameArea").getElementsByClassName("cards")[0].appendChild(dom);
        }
    } else {
        if (room.state.host == room.sessionId) {
            document.getElementById("startB").style.display = "inline-block";
        }
        document.getElementById("currentCard").src = "cards/card.png";
        $("#gameArea .cards").empty();
        for (let i = 0; i < room.state.players[room.sessionId].cards; i++){
            dom = document.createElement("img");
            dom.src = "cards/card.png"
            dom.className = "card"
            document.getElementById("gameArea").getElementsByClassName("cards")[0].appendChild(dom);
        }
    }
    if (room.state.turn == room.sessionId && room.state.waitingForChange) {
        document.getElementById("colours").style.display = "inline-block";
    } else {
        document.getElementById("colours").style.display = "none";
    }
}

function message() {
    room.send({text: "test"});
}

function start() {
    room.send({start: true});
}

function transferHost(clientId) {
    document.getElementById("startB").style.display = "none";
    room.send({transfer: clientId});
}

function pickup() {
    room.send({pickup: true});
}

function playCard(colour, number) {
    room.send({playTurn: {colour: colour, number: number}});
}

function pickColour(colour) {
    room.send({pickColour: colour});
}
