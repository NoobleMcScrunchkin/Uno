var client = new Colyseus.Client('ws://' + location.host + ':3214');
var room = undefined;
var myCards = [];
var winner = undefined;
var cardEl = [];
var pCards = {};
var currentCard = "";
var found = false;

rooms = undefined;
client.getAvailableRooms().then(function(value) { rooms = value } )

document.addEventListener("keydown", (e) => {if (e.keyCode === 13) {e.preventDefault(); join();}})

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
        connectParticles: true,
        speed: 0.5
    });

    if (location.search.replace("?", "") != "") {
        for (let room in rooms) {
            if (rooms[room].roomId == location.search.replace("?", "")) {
                found = true;
            }
        }
        if (found) {
            document.getElementById("roomInp").value = location.search.replace("?", "");
            document.getElementById("roomInp").parentElement.hidden = true;
            document.getElementById("tablegroup").hidden = true;
        }
    }

    refreshList();
}

function refreshList() {
    $(".listRow").remove()
    client.getAvailableRooms().then(function(value) {
        rooms = value
        for (let i = 0; i < rooms.length; i++) {
            let dom = document.createElement("tr");
            dom.className = "listRow";
            document.getElementById("listBod").appendChild(dom);
            let td = document.createElement("td");
            td.textContent = rooms[i].metadata.name;
            dom.appendChild(td);
            td = document.createElement("td");
            td.textContent = rooms[i].clients + "/" + rooms[i].maxClients;
            dom.appendChild(td);
            td = document.createElement("td");
            td.innerHTML = '<button type="button" style="margin: auto;" class="button buttonBlue" onclick="joinRoom(document.getElementById(`nameInp`).value, `' + rooms[i].roomId + '`)">Join<div class="ripples buttonRipples"><span class="ripplesCircle"></span></div></button>';
            dom.appendChild(td);
            // console.log(1);
        }
        if (rooms.length == 0) {
            let dom = document.createElement("tr");
            dom.className = "listRow";
            document.getElementById("listBod").appendChild(dom);
            let td = document.createElement("td");
            td.colSpan = 3;
            td.textContent = "No Rooms";
            dom.appendChild(td);
        }
    });
}

function join() {
    if (room == undefined) {
        let name = document.getElementById("nameInp").value;
        let id = document.getElementById("roomInp").value;
        joinRoom(name, id);
    }
}

function joinRoom(name, id) {
    refreshList();
    if (!name.replace(/\s/g, '').length) {
        name = "Player";
    }
    if (room == undefined) {
        if (!id.replace(/\s/g, '').length) {
            client.create("unoRoom", { name: name }).then(room => {runGame(room)}).catch(e => {
                console.error("join error", e);
            });
        } else {
            let pass = "";
            let passReq = false;
            for (let i = 0; i < rooms.length; i++) {
                console.log(1);
                console.log(rooms[i])
                if (rooms[i].metadata.private && rooms[i].roomId == id) {
                    passReq = true;
                }
            }
            if (passReq) {
                pass = window.prompt("Enter the Room Password");
            }
            client.joinById(id, { name: name, password: pass }).then(room => {runGame(room)}).catch(e => {
                console.error("join error (Game may have started)", e);
            });
        }
    }
}

function runGame(roomP) {
    room = roomP;

    document.getElementsByTagName("body")[0].className = "game";
    document.getElementById("entry").hidden = true;
    document.getElementById("game").hidden = false;

    room.onMessage((message) => {
        if (message.cards != undefined) {
            myCards = sort(message.cards);
            winner = undefined;
        } else if (message.winner != undefined) {
            winner = message.winner;
        } else if (message.cardPlayed != undefined && message.cardPlayed != room.sessionId) {
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transition = "all 0ms";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.setProperty('width', pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].width.toString() + "px", 'important');
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.setProperty('height', pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].height.toString() + "px", 'important');
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.left = pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].getBoundingClientRect().left + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.top = pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].getBoundingClientRect().top + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].setAttribute("onclick", "");
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.setProperty('position', 'fixed', 'important');
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.zIndex = 10;
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transition = "all 300ms";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.setProperty('padding', '0px', 'important');
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.left = (document.getElementById("currentCard").getBoundingClientRect().left) + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.top = (document.getElementById("currentCard").getBoundingClientRect().top) + "px";
            let sf = document.getElementById("currentCard").width / pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].width;
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transformOrigin = "0 0";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transform = "scale(" + sf + ")";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].className += " moved";
        }
    });

    room.onStateChange((state) => draw());
}

function bubbleSort(arr) {
    let sorting = false;
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].number > arr[i + 1].number) {
            let temp = arr[i];
            arr[i] = arr[i + 1];
            arr[i + 1] = temp;
            sorting = true;
        }
    }
    if (sorting) {
        bubbleSort(arr);
    }
    return arr;
}

// r, b, y, g

function sort(cardsUnsort) {
    let cards = bubbleSort(cardsUnsort);
    let red = [];
    let blue = [];
    let yellow = [];
    let green = [];
    let wild = [];
    for (let i = 0; i < cards.length; i++) {
        if (cards[i].number < 13) {
            switch (cards[i].colour) {
                case "r":
                    red.push(cards[i]);
                    break;
                case "b":
                    blue.push(cards[i]);
                    break;
                case "y":
                    yellow.push(cards[i]);
                    break;
                case "g":
                    green.push(cards[i]);
                    break;
            }
        } else {
            wild.push(cards[i]);
        }
    }
    return red.concat(blue).concat(yellow).concat(green).concat(wild);
}

window.addEventListener("resize", function() { if (room != undefined) { draw(); }});

function draw() {
    if (room.state.turn == room.sessionId) {
        document.getElementById("turn").style.display = "inline";
    } else {
        document.getElementById("turn").style.display = "none";
    }

    document.getElementById("bigCards").style.marginTop = (window.innerHeight / 2) - (document.getElementById("currentCard").height) + "px";
    $("#swap").empty();
    $("#toggles").empty();
    $("#player1").empty();
    $("#player2").empty();
    $("#player3").empty();
    $("#player4").empty();
    $("#player5").empty();
    $("#player6").empty();
    $("#player7").empty();
    $(".moved").remove();
    cardEl = [];

    let nameDom = document.createElement("span");
    nameDom.textContent = "Room Name: "
    document.getElementById("toggles").appendChild(nameDom);
    let inp = document.createElement("input");
    inp.id = "nameInput"
    if (room.state.host != room.sessionId) {
        inp.disabled = true;
    }
    inp.value = room.state.name;
    inp.onblur = function() {room.send({ name: document.getElementById("nameInput").value })};
    nameDom.appendChild(inp);
    document.getElementById("toggles").appendChild(document.createElement("br"));

    dom = document.createElement("span");
    dom.textContent = "Room ID: ";
    document.getElementById("toggles").appendChild(dom);
    indom = document.createElement("span");
    indom.className = "forceSelect";
    indom.textContent = room.id;
    dom.appendChild(indom);
    document.getElementById("toggles").appendChild(document.createElement("br"));

    l1 = document.createElement("label");
    l1.className = "container";
    l1.textContent = "Private";
    document.getElementById("toggles").appendChild(l1);

    l2 = document.createElement("input");
    l2.type = "checkbox";
    if (room.state.private) {
        l1.style.marginBottom = "0px";
        l2.checked = "checked";
    }
    if (room.state.host != room.sessionId || room.state.turn != "") {
        l2.disabled = true;
    } else {
        l2.setAttribute("onclick", "if (this.checked) { room.send({private: true}) } else { room.send({private: false}); }");
    }
    l1.appendChild(l2);

    l3 = document.createElement("span");
    l3.className = "checkmark";
    l1.appendChild(l3)

    if (room.state.private) {
        let passDom = document.createElement("span");
        passDom.textContent = "Password: "
        document.getElementById("toggles").appendChild(passDom);
        let passInp = document.createElement("input");
        passInp.id = "passInput";
        if (room.state.host != room.sessionId) {
            passInp.disabled = true;
        }
        passInp.value = room.state.password;
        passInp.onblur = function() {room.send({ password: document.getElementById("passInput").value })};
        passDom.appendChild(passInp);
        document.getElementById("toggles").appendChild(document.createElement("br"));
    }

    l1 = document.createElement("label");
    l1.className = "container";
    l1.textContent = "Stacking"
    document.getElementById("toggles").appendChild(l1);

    l2 = document.createElement("input");
    l2.type = "checkbox";
    if (room.state.stacking) {
        l2.checked = "checked";
    }
    if (room.state.host != room.sessionId || room.state.turn != "") {
        l2.disabled = true;
    } else {
        l2.setAttribute("onclick", "if (this.checked) { room.send({stacking: true}) } else { room.send({stacking: false}); }");
    }
    l1.appendChild(l2);

    l3 = document.createElement("span");
    l3.className = "checkmark";
    l1.appendChild(l3)

    l1 = document.createElement("label");
    l1.className = "container";
    l1.textContent = "7-0"
    document.getElementById("toggles").appendChild(l1);

    l2 = document.createElement("input");
    l2.type = "checkbox";
    if (room.state.sevenZero) {
        l2.checked = "checked";
    }
    if (room.state.host != room.sessionId || room.state.turn != "") {
            l2.disabled = true;
        } else {
        l2.setAttribute("onclick", "if (this.checked) { room.send({sevenZero: true}) } else { room.send({sevenZero: false}); }");
    }
    l1.appendChild(l2);

    l3 = document.createElement("span");
    l3.className = "checkmark";
    l1.appendChild(l3)

    l1 = document.createElement("label");
    l1.className = "container";
    l1.textContent = "Jump In"
    document.getElementById("toggles").appendChild(l1);

    l2 = document.createElement("input");
    l2.type = "checkbox";
    if (room.state.jumpIn) {
        l2.checked = "checked";
    }
    if (room.state.host != room.sessionId || room.state.turn != "") {
        l2.disabled = true;
    } else {
        l2.setAttribute("onclick", "if (this.checked) { room.send({jumpIn: true}) } else { room.send({jumpIn: false}); }");
    }
    l1.appendChild(l2);

    l3 = document.createElement("span");
    l3.className = "checkmark";
    l1.appendChild(l3)

    if (room.state.players[room.sessionId].cards == 2 && room.state.turn == room.sessionId && !room.state.waitingForSwap && !room.state.waitingForChange && !room.state.players[room.sessionId].uno) {
        document.getElementById("unoB").style.display = "inline-block";
    } else {
        document.getElementById("unoB").style.display = "none";
    }

    if (room.state.contestable && room.sessionId != room.state.calledUno) {
        document.getElementById("contestB").style.display = "inline-block";
    } else {
        document.getElementById("contestB").style.display = "none";
    }

    pCards = {};
    let i = 1;
    for (let player in room.state.players) {
        if (player != room.sessionId) {
            playerDom = document.getElementById("player" + i);
            $("#player" + i).empty();

            let div = document.createElement("div");
            div.className = "tooltip"
            document.getElementById("player" + i).appendChild(div);
            dom = document.createElement("span");
            if (room.state.turn == player) {
                dom.style.color = "red";
            }
            dom.textContent = room.state.players[player].name;
            if (room.state.host == player) {
                dom.textContent += " (Host)"
            }
            if (room.state.players[player].uno && room.state.turn != "") {
                dom.textContent += " (Uno)"
            }
            if (winner != undefined && room.state.turn == "" && winner == player) {
                dom.textContent += " (Winner)"
            }
            div.style.height = "10%"
            div.appendChild(dom);
            if (room.sessionId == room.state.host && player != room.state.host) {
                div.setAttribute("onclick","transferHost('" + player + "')");
                tip = document.createElement("span");
                tip.className = "tooltiptext";
                tip.textContent = "Click to transfer host";
                div.appendChild(tip);
            }

            pCards[player] = [];

            dom = document.createElement("span");
            dom.textContent = room.state.players[player].name;
            dom.setAttribute("onclick","pickSwap('" + player + "')");
            dom.className = "tooltip"
            dom.style.borderBottom = "1px white solid";
            dom.style.width = "100%";
            document.getElementById("swap").appendChild(dom);
            tip = document.createElement("span");
            tip.className = "tooltiptext";
            tip.textContent = "Click to swap";
            dom.appendChild(tip);
            document.getElementById("swap").appendChild(document.createElement("br"));

            div = document.createElement("div");
            div.className = "pCards";
            playerDom.appendChild(div);

            for (let j = 0; j < room.state.players[player].cards; j++) {
                dom = document.createElement("img");
                dom.src = "cards/card.png";
                dom.className = "card";
                playerDom.getElementsByClassName("pCards")[0].appendChild(dom);
                let left =  j * ((playerDom.getElementsByClassName("pCards")[0].clientWidth - dom.clientWidth) / (room.state.players[player].cards - 1));
                if (left != 0)
                left = left || ((playerDom.getElementsByClassName("pCards")[0].clientWidth / 2) - (dom.clientWidth / 2));
                dom.style.left = left + "px";
                pCards[player].push(dom);
            }

            i++;
        }
    }
    if (room.state.turn != "") {
        document.getElementById("startB").style.display = "none";
        if (!room.state.waitingForChange) {
            document.getElementById("currentCard").src = "cards/" + room.state.currentCardColour + room.state.currentCardNumber + ".png";
        } else{
            document.getElementById("currentCard").src = "cards/" + room.state.currentCardNumber + ".png";
        }
        if (!room.state.waitingForSwap && !room.state.waitingForChange) {
            $("#gameArea .cards").empty();
            for (let i = 0; i < myCards.length; i++) {
                dom = document.createElement("img");
                if (myCards[i].number < 13) {
                    dom.src = "cards/" + myCards[i].colour + myCards[i].number + ".png";
                } else {
                    dom.src = "cards/" + myCards[i].number + ".png";
                }
                dom.setAttribute("onclick","playCard(" + i + ", '" + myCards[i].colour + "', " + myCards[i].number + ")");
                dom.className = "card";
                document.getElementById("gameArea").getElementsByClassName("cards")[0].appendChild(dom);
                cardEl.push(dom);
            }
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
    if (room.state.turn == room.sessionId && room.state.waitingForSwap && !room.state.waitingForChange) {
        document.getElementById("swap").style.display = "inline-block";
    } else {
        document.getElementById("swap").style.display = "none";
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

function playCard(index, colour, number) {
    if ((room.state.jumpIn && ((number == room.state.currentCardNumber && colour == room.state.currentCardColour) || (room.state.currentCardNumber == number && number > 12))) || room.sessionId == room.state.turn) {
        if ((colour == "r" || colour == "g" || colour == "b" || colour == "y") && number > -1 && number < 15) {
            if ((room.state.cardsToPick == 0 && (number > 12 || room.state.currentCardColour == colour || room.state.currentCardNumber == number)) || (room.state.cardsToPick > 0 && number == room.state.stackPlayed)) {
                room.send({ playingCard: true });
                cardEl[index].style.transition = "all 0ms";
                cardEl[index].style.setProperty('width', cardEl[index].width.toString() + "px", 'important');
                cardEl[index].style.setProperty('height', cardEl[index].height.toString() + "px", 'important');
                cardEl[index].style.left = cardEl[index].getBoundingClientRect().left + "px";
                cardEl[index].style.top = cardEl[index].getBoundingClientRect().top + "px"
                cardEl[index].setAttribute("onclick", "");
                cardEl[index].style.setProperty('position', 'fixed', 'important');
                cardEl[index].style.zIndex = 10;
                cardEl[index].style.transition = "all 300ms";
                cardEl[index].style.setProperty('padding', '0px', 'important');
                cardEl[index].style.left = (document.getElementById("currentCard").getBoundingClientRect().left) + "px";
                cardEl[index].style.top = (document.getElementById("currentCard").getBoundingClientRect().top) + "px";
                let sf = document.getElementById("currentCard").width / cardEl[index].width;
                cardEl[index].style.transformOrigin = "0 0";
                cardEl[index].style.transform = "scale(" + sf + ")";
                cardEl[index].className += " moved";
                setTimeout(() => {  room.send({playTurn: {colour: colour, number: number}}); }, 300);
            }
        }
    }
}

function pickColour(colour) {
    room.send({pickColour: colour});
}

function pickSwap(player) {
    room.send({pickSwap : player});
}

function uno() {
    room.send({uno: true});
}

function contest() {
    room.send({contest: true});
}
