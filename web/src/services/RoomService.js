import { Alert } from 'react-bootstrap';

/**
 * Configuration service
 */
class RoomService {

  constructor() {
    this.connected = false;
    this.userName = '';
    this.room = 'default';
    this.pid;

    this.socket;
    this.participants = {};
    this.usersInRoom = {};
    this.messages = [];

    this.reconnectInterval = 1000;
    this.reconnection = false;
    this.callback = null;
  }

  /**
   * @param callback - function to call when state updated
   */
  initSocket(callback) {
    this.callback = callback;

    const pathArray = window.location.pathname.split( '/' );
    if (window.location.pathname.length > 1 && pathArray.length >= 2) {
      this.room = pathArray[pathArray.length - 1];
    }
    this.userName = localStorage.getItem("username") || ("User " + Math.floor(100 * Math.random()));
    console.log('Init room:' + this.room + ', userName:' + this.userName);
    this.callback();

    setInterval(() => {
      if (this.connected && this.pid) {
        this.send({messageType: "ping", fromUserId: this.pid});
      }
    }, 60000);

    this.connect();
  }

  tryConnectAgain() {
    this.reconnection = true;
    this.setError("Reconnecting...");
    setTimeout(() => {
      this.reconnectInterval *= (1.5 + 0.2 * Math.random());
      this.connect();
    }, this.reconnectInterval);
  }

  connect() {
    try {
      // const host = location.host;
      const protocol = location.protocol == "https:" ? "wss:" : "ws:";
      // const url = protocol + "//" + location.host + "/stream/" + room;
      const url = 'wss://local.trembit.com:443' + "/stream/" + this.room;
      console.log("Connecting to " + url + " from " + window.location.pathname);
      this.socket = new WebSocket(url);
      this.socket.onmessage = e => this.onSocketMessage(e);
      this.socket.onopen = (evt) => {
        if (this.reconnection) {
          window.location = window.location; // Reloading the page to reset states
          return;
        }
        this.connected = true;
        console.log("websocket on open");
        this.send({messageType: "join", name: this.userName});
      };
      this.socket.onclose = (evt) => {
        this.connected = false;
        this.tryConnectAgain();
      };
      this.socket.onerror = (evt) => {
        console.error("error", evt);
        this.setError("Can't establish socket connection.");
      };
    } catch (e) {
      this.setError("WebSocket connection failed.");
    }
  }

  onSocketMessage(e) {
    var m = JSON.parse(e.data);
    console.log("onSocketMessage " + m.messageType + " " + e.data.substr(0, 100));
    if (m.messageType == "youAre") {
      this.pid = m.pid;
      console.log("Set pid " + this.pid);
      // $localTextArea.html("Your id is " + pid + " in " + room);
      //$("#pid").html("Id: " + pid);
    } else if (m.messageType == "change") {
      if (m.bracket == "user") {
        console.log("user change " + m.id + " " + m.value);
        const userId = m.id;
        const participant = this.participants[userId];
        if (m.value == null) {
          // delete user
          delete this.usersInRoom[userId];
          if (participant) {
            delete this.participants[userId];
            participant.dispose();
          }
        } else {
          if (m.value.id && m.value.name) {
            // $("#"+ m.value.id).find(".username").html(m.value.name);
            this.usersInRoom[m.value.id] = m.value.name;
          }
          if (!participant) {
            this.participants[userId] = participant;
            if (this.pid != userId) {    // don't subscribe own video
              //receiveVideo(userId)
            }
          }
        }
        // users in room
        var count = 0,
          list = "";
        for (var i in this.usersInRoom){
          count++;
          list = list + this.usersInRoom[i] + ", ";
        }
        this.count = count;
        // $usersNumber.html(count);
        // $usersList.html(list.slice(0,-2));
      } else if (m.key.indexOf("broadcast.") == 0) {
        var broadcastUserId = m.key.split(".")[1];
        this.doChangeBroadcast(broadcastUserId, m.value);
      } else if (m.key.indexOf("chat.") == 0) {
        this.messages.push({ key: m.key, value: "<p>" + m.value + "</p>" });
        // $chatArea.get(0).scrollTop = $chatArea.get(0).scrollHeight;
        //console.log("Append child " + m.value)
      }
    } else if (m.messageType == "chatClear") {
      // $chatArea.html("");
      this.messages = [];
    } else if (m.messageType == "sendTo") {
      this.doSendTo(m.fromUserId, m.value);
      if (m.realName) {
        $("#"+ m.fromUserId).find(".username").html(m.realName);
      }
    } else if (m.messageType == "chatMessage") {
      // add DOM element
      this.messages.push({ key: m.key, value: "<p><span>" + m.name + ": </span>" + m.message + "</p>" });
      // $chatArea.html($chatArea.html() + "<p><span>" + m.name + ": </span>" + m.message + "</p>")
      // scroll to bottom
      // $chatArea.get(0).scrollTop = $chatArea.get(0).scrollHeight;
    } else if (m.messageType == "status") {
      // $localTextArea.html(m.local);
      // $allTextArea.html(m.all);
    } else if (m.messageType == "webRtcAnswer") {
      this.participants[m.broadcastUserId].webRtcAnswer(m);
      if (m.broadcastUserId == this.pid) {
        // add local broadcast object to state
        this.sendChangeMessage("broadcast." + this.pid, true);
      }
    } else if (m.messageType == "webRtcProblem") {
      var participant = this.participants[m.broadcastUserId];
      if (participant) {
        participant.webRtcProblem(m);
        if (m.broadcastUserId == this.pid) {
          this.setBroadcastingState(false);
          participant.dispose();
          delete this.participants[m.broadcastUserId];
        }
        this.setError(m.message);
      }
    } else if (m.messageType == "onIceCandidateFound") {
      console.log("onIceCandidateFound received");
      console.log(m);

      this.participants[m.broadcastUserId].onIceCandidateFound(m);
    } else {
      console.log("ERROR: Unhandled message type " + m.messageType);
    }

    // update view
    this.callback();
  }

  doSendTo(fromUserId, value) {
    var participant = this.participants[value.broadcastId];
    if (participant) {
      participant[value.method](fromUserId, value);
    }
  }

  doChangeBroadcast(remoteUserId, value) {
    if (remoteUserId != this.pid) {
      var existingBroadcast = this.participants[remoteUserId];

      if (existingBroadcast && !value) {
        existingBroadcast.dispose();
        delete this.participants[remoteUserId];
        delete this.usersInRoom[remoteUserId];
      } else if (!existingBroadcast && value) {
        this.receiveVideo(remoteUserId);
      }
    }
  }

  // send modify state message
  sendChangeMessage(key, value) {
    this.send({ messageType: "change", key: key, value: value, realName: this.userName });
  }

  clearChat() {
    this.send({ messageType: "clearChat", fromUserId: this.pid });
  }

  // send message to specific user
  sendToMessage(toUserId, value) {
    this.send({messageType: "sendTo", toUserId: toUserId, fromUserId: this.pid, value: value, realName: this.userName});
  }

  receiveVideo(remoteUserId) {
    console.log("receiveVideo remoteUserId:" + remoteUserId);
    const participant = new Participant(remoteUserId, this.send, false);
    this.participants[remoteUserId] = participant;
    participant.start();
  }

  sendChatMessage(msg) {
    this.sendChangeMessage("chat." + new Date().getTime(), "" + this.userName + ": " + msg);
    // $commandInput.val("");
  }

  setBroadcastingState(value) {
    this.broadcasting = value;
    // $commandPlayButton.text(broadcasting ? "Stop Broadcast" : "Start Broadcast");
    // $commandPlayButton.removeClass(broadcasting ? "btn-success" : "btn-danger").addClass(broadcasting ? "btn-danger" : "btn-success");
    // $me.removeClass(broadcasting ? "hidden" : "").addClass(broadcasting ? "" : "hidden");
  }




  setError(msg) {
    console.error(msg);
  }

  getInitialData() {
    return {
      userName: localStorage.getItem("username") || ("User " + Math.floor(100 * Math.random()))
    }
  }

  send(o) {
    if (!this.connected) return;
    if (o.messageType != "ping") {
      console.log("Sending " + JSON.stringify(o));
    }
    this.socket.send(JSON.stringify(o));
  }
}

export const RoomServiceInstance = new RoomService();
