var client = new Colyseus.Client('ws://' + location.host + ':3214');
var room = undefined;
var myCards = [];
var winner = undefined;
var cardEl = [];
var pCards = {};
var currentCard = "";

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
            let style = window.getComputedStyle(document.getElementById("currentCard"));
            let marginTop = style.getPropertyValue('margin-top');
            let marginLeft = style.getPropertyValue('margin-left');
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.left = pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].getBoundingClientRect().left + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.top = pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].getBoundingClientRect().top + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.width = pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].width + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.height = pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].height + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].setAttribute("onclick", "");
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.position = "fixed";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.zIndex = 10;
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transition = "all 300ms";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.padding = "0px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.left = (document.getElementById("currentCard").getBoundingClientRect().left) + "px";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.top = (document.getElementById("currentCard").getBoundingClientRect().top) + "px";
            let sf = document.getElementById("currentCard").width / pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].width;
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transformOrigin = "0 0";
            pCards[message.cardPlayed][pCards[message.cardPlayed].length - 1].style.transform = "scale(" + sf + ")";
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

function draw() {
    $("#swap").empty();
    $("#players").empty();
    cardEl = [];
    dom = document.createElement("span");
    dom.textContent = "Room ID: ";
    document.getElementById("players").appendChild(dom);
    indom = document.createElement("span");
    indom.className = "forceSelect";
    indom.textContent = room.id;
    dom.appendChild(indom);
    document.getElementById("players").appendChild(document.createElement("br"));

    l1 = document.createElement("label");
    l1.className = "container";
    l1.textContent = "Stacking"
    document.getElementById("players").appendChild(l1);

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
    document.getElementById("players").appendChild(l1);

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
    document.getElementById("players").appendChild(l1);

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

    if (room.state.players[room.sessionId].cards == 2 && room.state.turn == room.sessionId && !room.state.waitingForSwap && !room.state.waitingForChange) {
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

    for (let player in room.state.players) {
        if (player != room.sessionId) {
            dom = document.createElement("span");
            dom.textContent = room.state.players[player].name;
            dom.setAttribute("onclick","pickSwap('" + player + "')");
            dom.className = "tooltip"
            dom.style.borderBottom = "1px white solid";
            dom.style.width = "100%";
            document.getElementById("swap").appendChild(dom);
<<<<<<< HEAD
        }
        tip = document.createElement("span");
        tip.className = "tooltiptext";
        tip.textContent = "Click to swap";
        dom.appendChild(tip);
=======
            tip = document.createElement("span");
            tip.className = "tooltiptext";
            tip.textContent = "Click to swap";
            dom.appendChild(tip);
        }
>>>>>>> bd9e9d0024c7839b8923ae528e197ff188cc7286
        document.getElementById("swap").appendChild(document.createElement("br"));
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
        if (room.state.players[player].uno) {
            dom.textContent += " (Uno)"
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
        pCards[player] = [];
        for (let i = 0; i < room.state.players[player].cards; i++){
            dom = document.createElement("img");
            dom.src = "cards/card.png"
            dom.className = "card"
            div.appendChild(dom);
            pCards[player].push(dom);
        }
    }
    if (room.state.turn != "") {
        document.getElementById("startB").style.display = "none";
        document.getElementById("currentCard").src = "cards/" + room.state.currentCardColour + room.state.currentCardNumber + ".png";
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
    if (room.state.jumpIn && number == room.state.currentCardNumber && colour == room.state.currentCardColour || room.sessionId == room.state.turn) {
        if ((colour == "r" || colour == "g" || colour == "b" || colour == "y") && number > -1 && number < 15) {
            if ((room.state.cardsToPick == 0 && (number > 12 || room.state.currentCardColour == colour || room.state.currentCardNumber == number)) || (room.state.cardsToPick > 0 && number == this.state.stackPlayed)) {
                room.send({ playingCard: true });
                let style = window.getComputedStyle(document.getElementById("currentCard"));
                let marginTop = style.getPropertyValue('margin-top');
                let marginLeft = style.getPropertyValue('margin-left');
                cardEl[index].style.left = cardEl[index].getBoundingClientRect().left + "px";
                cardEl[index].style.top = cardEl[index].getBoundingClientRect().top + "px";
                cardEl[index].style.width = cardEl[index].width + "px";
                cardEl[index].style.height = cardEl[index].height + "px";
                cardEl[index].setAttribute("onclick", "");
                cardEl[index].style.position = "fixed";
                cardEl[index].style.zIndex = 10;
                cardEl[index].style.transition = "all 300ms";
                cardEl[index].style.padding = "0px";
                cardEl[index].style.left = (document.getElementById("currentCard").getBoundingClientRect().left) + "px";
                cardEl[index].style.top = (document.getElementById("currentCard").getBoundingClientRect().top) + "px";
                let sf = document.getElementById("currentCard").width / cardEl[index].width;
                cardEl[index].style.transformOrigin = "0 0";
                cardEl[index].style.transform = "scale(" + sf + ")";
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
