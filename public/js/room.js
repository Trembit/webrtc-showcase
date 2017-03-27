(function () {
    // UI elements
    var $room = $('#room'),
        $me = $("#me"),
        $usersNumber = $("#users-number"),
        $usersList = $("#users-list"),
        $commandPlayButton = $('#commandPlayButton'),
        $commandSendButton = $('#commandSendButton'),
        $commandClearButton = $('#commandClearButton'),
        $pname = $('#pname'),
        $modalNameQuery = $("#modal-name-query"),
        $modalNameInput = $("#modal-name-input"),
        $modalNameSave = $("#modal-name-save"),
        $modalNameClose1 = $("#modal-name-close1"),
        $commandInput = $("#commandInput"),
        $chatArea = $("#chatArea"),
        $localTextArea = $("#localTextArea"),
        $allTextArea = $("#allTextArea"),
        $modalError = $('#modal-error'),
        $error = $('#error');

    $(window).load(function(){
        $room.text(room);
        console.log("Page loaded ...");
    });

    function removeError() {
        $modalError.modal('hide');
    }
    function setError(message) {
        $error.text(message);
        $modalError.modal('show');
    }
    if (!window.WebSocket) {
        if (window.MozWebSocket)
            window.WebSocket = window.MozWebSocket
    }
    if (!window.WebSocket) {
        setError("WebSocket is not supported by your browser.");
        return;
    }

    var room = "default";
    var participants = {};
    var name;
    var broadcasting = false;
    var usersInRoom = {};
    var insideIframe = (window.parent != window);
    var isMobile = /ipad|iphone|android/i.test(navigator.userAgent);

    // STATES
    // Key value store of data
    var roomState = {};    // persisted state: shared content, chat

    var pid;
    var pname;
    var onSocketMessage;

    pname = localStorage.getItem("pname");
    if (!insideIframe && !pname) {
        $pname.trigger("click");
    }
    if (!pname) {
        pname = "User " + Math.floor(100 * Math.random());
    }
    setInterval(function() {
        if (connected) {
            send({messageType: "ping", fromUserId: pid});
        }
    }, 60000);

    // send modify state message
    function sendChangeMessage(key, value) {
        send({messageType: "change", key: key, value: value, realName: pname});
    }

    // send message to specific user
    function sendToMessage(toUserId, value) {
        send({messageType: "sendTo", toUserId: toUserId, fromUserId: pid, value: value, realName: pname});
    }

    function receiveVideo(remoteUserId) {
        console.log("receiveVideo remoteUserId:" + remoteUserId);
        var participant = new Participant(remoteUserId, send, false);
        participants[remoteUserId] = participant;
        participant.start();
    }

    function sendChatMessage() {
        sendChangeMessage("chat." + new Date().getTime(), "" + pname + ": " + $commandInput.val());
        $commandInput.val("");
    }

    $pname.text(pname);

    $modalNameQuery.on('shown.bs.modal', function () {
        $modalNameInput.val("").focus();
    });

    $modalNameSave.click(function(){
        var n = $modalNameInput.val();
        if (n) {
            localStorage.setItem("pname", n);
            pname = $modalNameInput.val();
        }
        send({messageType: "changeName", name: pname});
        $pname.text(pname);
        $modalNameInput.val("");
        $modalNameClose1.trigger("click");
    });

    $modalNameInput.keypress(function(e) {
        if(e.which == 13) {
            $modalNameSave.trigger("click");
        }
    });

    $commandSendButton.on('click', function (e) {
        $commandInput.trigger("change");
    }, false);

    $commandInput.change(function(){
        sendChatMessage();
    });

    $commandClearButton.on('click', function (e) {
        send({messageType: "clearChat", fromUserId: pid});
    });

    // start or stop local broadcast
    $commandPlayButton.on('click', function (e) {
        var participant = participants[pid];
        if (broadcasting) {
            broadcasting = false;
            $commandPlayButton.text(broadcasting ? "Stop Broadcast" : "Start Broadcast");
            $commandPlayButton.removeClass(broadcasting ? "btn-success" : "btn-danger").addClass(broadcasting ? "btn-danger" : "btn-success");
            $me.removeClass(broadcasting ? "hidden" : "").addClass(broadcasting ? "" : "hidden");
            // remove local broadcast object from state
            sendChangeMessage("broadcast." + pid, null);

            if (participant) {
                delete participants[pid];
                delete usersInRoom[pid];
                participant.dispose();
                console.log("Removing local broadcast")
            }
        } else {
            console.log(pid + " registered in room " + room);
            if (participant) {
                participant.dispose();
            }
            participant = new Participant(pid, send, true);
            participants[pid] = participant;
            participant.start().then(onBroadcastReady);
            //$('#commandPlayButton').text("Starting...");
        }
    });

    function onBroadcastReady() {
        console.log("onBroadcastReady");
        broadcasting = true;
        $commandPlayButton.text(broadcasting ? "Stop Broadcast" : " Start Broadcast");
        $commandPlayButton.removeClass(broadcasting ? "btn-success" : "btn-danger").addClass(broadcasting ? "btn-danger" : "btn-success");
        $me.removeClass(broadcasting ? "hidden" : "").addClass(broadcasting ? "" : "hidden");
    }


    // WebSocket
    var socket;
    var connected = false;

    var reconnectInterval = 1000;
    var reconnection = false;

    function tryConnectAgain() {
        reconnection = true;
        setError("Reconnecting...");
        setTimeout(function () {
            reconnectInterval *= (1.5 + 0.2 * Math.random());
            connect();
        }, reconnectInterval);
    }

    function connect() {
        try {
            var pathArray = window.location.pathname.split( '/' );
            if (window.location.pathname.length > 1 && pathArray.length >= 2) {
                room = pathArray[pathArray.length - 1];
            }
            var protocol = location.protocol == "https:" ? "wss:" : "ws:";
            var url = protocol + "//" + location.host + "/stream/" + room;
            console.log("Connecting to " + url + " from " + window.location.pathname);
            socket = new WebSocket(url);
            socket.onmessage = onSocketMessage;
            socket.onopen = function (evt) {
                if (reconnection) {
                    window.location = window.location; // Reloading the page to reset states
                    return;
                }
                connected = true;
                console.log("websocket on open");
                send({messageType: "join", name: pname});
            };
            socket.onclose = function (evt) {
                connected = false;
                tryConnectAgain();
            };
            socket.onerror = function (evt) {
                console.error("error", evt);
            };
        } catch (e) {
            setError("WebSocket connection failed.");
        }
    }

    function send(o) {
        if (!connected) return;
        if (o.messageType != "ping") {
            console.log("Sending " + JSON.stringify(o));
        }
        socket.send(JSON.stringify(o));
    }

    function doChangeBroadcast(remoteUserId, value) {
        if (remoteUserId != pid) {
            var existingBroadcast = participants[remoteUserId];

            if (existingBroadcast && !value) {
                existingBroadcast.dispose();
                delete participants[remoteUserId];
                delete usersInRoom[remoteUserId];
            } else if (!existingBroadcast && value) {
                receiveVideo(remoteUserId);
            }
        }
    }

    function doSendTo(fromUserId, value) {
        var participant = participants[value.broadcastId];
        if (participant) {
            participant[value.method](fromUserId, value);
        }
    }


    (function () {

        onSocketMessage = function (e) {
            var m = JSON.parse(e.data);
            console.log("onSocketMessage " + m.messageType + " " + e.data.substr(0, 100));
            if (m.messageType == "youAre") {
                pid = m.pid;
                console.log("Set pid " + pid);
                $localTextArea.html("Your id is " + pid + " in " + room);
                //$("#pid").html("Id: " + pid);
            } else if (m.messageType == "change") {
                if (m.bracket == "user") {
                    console.log("user change " + m.id + " " + m.value);
                    var userId = m.id;
                    var participant = participants[userId];
                    if (m.value == null) {
                        // delete user
                        delete usersInRoom[userId];
                        if (participant) {
                            delete participants[userId];
                            participant.dispose();
                        }
                    } else {
                        if (m.value.id && m.value.name) {
                            $("#"+ m.value.id).find(".username").html(m.value.name);
                            usersInRoom[m.value.id] = m.value.name;
                        }
                        if (!participant) {
                            participants[userId] = participant;
                            if (pid != userId) {    // don't subscribe own video
                                //receiveVideo(userId)
                            }
                        }
                    }
                    // users in room
                    var count = 0,
                        list = "";
                    for (var i in usersInRoom){
                        count++;
                        list = list + usersInRoom[i] + ", ";
                    }
                    $usersNumber.html(count);
                    $usersList.html(list.slice(0,-2));
                } else if (m.key.indexOf("broadcast.") == 0) {
                    var broadcastUserId = m.key.split(".")[1];
                    doChangeBroadcast(broadcastUserId, m.value);
                } else if (m.key.indexOf("chat.") == 0) {
                    $chatArea.html($chatArea.html() + "<p>" + m.value + "</p>")
                    $chatArea.get(0).scrollTop = $chatArea.get(0).scrollHeight;
                    //console.log("Append child " + m.value)
                }
            } else if (m.messageType == "chatClear") {
                $chatArea.html("");
            } else if (m.messageType == "sendTo") {
                doSendTo(m.fromUserId, m.value);
                if (m.realName) {
                    $("#"+ m.fromUserId).find(".username").html(m.realName);
                }
            } else if (m.messageType == "chatMessage") {
                $chatArea.html($chatArea.html() + "<p><span>" + m.name + ": </span>" + m.message + "</p>")
                $chatArea.get(0).scrollTop = $chatArea.get(0).scrollHeight;
                //console.log("Append child " + m.message)
            } else if (m.messageType == "status") {
                $localTextArea.html(m.local);
                $allTextArea.html(m.all);
            } else if (m.messageType == "webRtcAnswer") {
                console.log("sdpAnswerMessage received " + m.broadcastUserId);
                participants[m.broadcastUserId].webRtcAnswer(m);
                if (m.broadcastUserId == pid) {
                    // add local broadcast object to state
                    sendChangeMessage("broadcast." + pid, true);
                }
            } else if (m.messageType == "webRtcProblem") {
                console.log("sdpAnswerMessage webRtcProblem " + m.broadcastUserId);
                var participant = participants[m.broadcastUserId];
                if (participant) {
                    participant.webRtcProblem(m);
                    participant.dispose();
                    if (m.broadcastUserId == pid) {
                        delete participants[m.broadcastUserId];
                    }
                    setError(m.message);
                }
            } else if (m.messageType == "onIceCandidateFound") {
                console.log("onIceCandidateFound received");
                console.log(m);

                participants[m.broadcastUserId].onIceCandidateFound(m);
            } else if (m.messageType == "sdpAnswerMessage") {
                var sdpAnswer = m.sdpAnswer;
                var userId = m.id;

                console.log("sdpAnswerMessage received " + userId);
                participants[userId].rtcPeer.processSdpAnswer(sdpAnswer);
            } else {
                console.log("ERROR: Unhandled message type " + m.messageType);
            }
        }
    }());

    connect();
}());
