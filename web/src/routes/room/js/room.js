(function () {
    // UI elements
    var $room = $('#room'),
        $me = $("#me"),
        $usersNumber = $("#users-number"),
        $usersList = $("#users-list"),
        $commandPlayButton = $('#commandPlayButton'),
        $commandScreenButton = $('#commandPlayButton'),
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
            setBroadcastingState(false);
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
        setBroadcastingState(true);
    }


    // WebSocket






    connect();

    if (!DetectRTC.isWebRTCSupported) {
        setError("Sorry. WebRTC is not supported in your browser. Please use Firefox or Chrome.")
    }

}());
