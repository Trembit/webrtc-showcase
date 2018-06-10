import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import { Participant } from './participant/Participant'

declare var DetectRTC: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('chat') private chat: ElementRef;

  public room: string;
  public participants: object;
  public name: string;
  public broadcasting: boolean;
  // public broadcastingScreen: boolean;
  public broadcastLoading: boolean;
  public usersInRoom: object;
  public insideIframe: boolean;
  public isMobile: boolean;

  // STATES
  // Key value store of data
  public roomState: object;    // persisted state: shared content, chat
  public pid: string;
  public pname: string;

  // WebSocket
  public socket;
  public connected = false;
  public reconnectInterval = 1000;
  public reconnection = false;

  public showModalName: boolean;
  public showError: boolean;
  public errorMessage: string;
  public usersNumber: number;
  public usersList: string;
  public chatMessages: any[];

  public constructor() {
    this.room = 'default';
    this.participants = {};
    this.name;
    this.broadcasting = false;
    this.usersInRoom = {};
    this.insideIframe = (window.parent != window);
    this.isMobile = /ipad|iphone|android/i.test(navigator.userAgent);
    this.roomState = {};

    this.socket;
    this.connected = false;
    this.reconnectInterval = 1000;
    this.reconnection = false;

    this.showModalName = false;
    this.showError = false;
    this.errorMessage = null;
    this.usersNumber = 0;
    this.usersList = '';
    this.chatMessages = [];
  }

  public ngOnInit() {
    console.log("Page loaded ...");

    let socketConfigResult = this.configureWebSocket();

    if (!socketConfigResult) {
      return;
    }
    this.connectViaSocket();

    this.connect();

    //this.onSocketMessage();
    if (!DetectRTC.isWebRTCSupported) {
      this.setError("Sorry. WebRTC is not supported in your browser. Please use Firefox or Chrome.")
    }
  }

  public setError(message: string): void {
    this.errorMessage = message;
    this.showError = true;
  }

  public removeError(): void {
    this.showError = false;
  }

  public openModalName(): void {
    this.showModalName = true;
  }

  public closeModalName(): void {
    this.showModalName = false;
  }

  public modalNameSave(name: string): void {
    if (name) {
      localStorage.setItem("pname", name);
      this.pname = name;
    }
    this.send({messageType: "changeName", name: this.pname});
    this.closeModalName();
  }

  public sendChatMessage(event: Event, value: string) {
    this.sendChangeMessage("chat." + new Date().getTime(), "" + this.pname + ": " + value);
  }

  public commandClearButton(): void {
    this.send({messageType: "clearChat", fromUserId: this.pid});
  }

  public onInputKeyPress(event: KeyboardEvent, input): void {
    if (event.charCode === 13) {
      this.sendChatMessage(null, input.value);
      input.value='';
    }
  }

  public commandPlayButton(isCamera: boolean): void {
    const participant = this.participants[this.pid];
    if (this.broadcasting) {
      this.setBroadcastingState(false);
      // remove local broadcast object from state
      this.sendChangeMessage("broadcast." + this.pid, null);

      if (participant) {
        delete this.participants[this.pid];
        delete this.usersInRoom[this.pid];
        participant.dispose();
        console.log("Removed local broadcast")
      }
    } else {
      console.log(this.pid + " registered in room " + this.room);
      if (participant) {
        participant.dispose();
      }
      const newParticipant = new Participant(this.pid, true, isCamera, this.send.bind(this));
      this.participants[this.pid] = newParticipant;
      newParticipant.start().then(this.onBroadcastReady.bind(this));
      this.broadcastLoading = true;
      //$('#commandPlayButton').text("Starting...");
    }
  }

  private setBroadcastingState(value) {
    this.broadcasting = value;
    this.broadcastLoading = false;
  }

  private scrollChatToBottom(): void {
    this.chat.nativeElement.scrollTop = this.chat.nativeElement.scrollHeight;
  }

  private configureWebSocket(): boolean {
    // WebSocket isn`t a default property of type Window
    let windowRef: any = window;

    if (!windowRef.WebSocket) {
      if (windowRef.MozWebSocket)
        windowRef.WebSocket = windowRef.MozWebSocket
    }
    if (!windowRef.WebSocket) {
      this.setError("WebSocket is not supported by your browser.");
      return false;
    }
    return true;
  }

  private connectViaSocket(): void {
    this.pname = localStorage.getItem("pname");
    if (!this.insideIframe && !this.pname) {
      this.openModalName();
    }
    if (!this.pname) {
      this.pname = "User " + Math.floor(100 * Math.random());
    }
    setInterval(function() {
      if (this.connected) {
        this.send({messageType: "ping", fromUserId: this.pid});
      }
    }.bind(this), 60000);
  }

  // send modify state message
  private sendChangeMessage(key, value) {
    this.send({messageType: "change", key: key, value: value, realName: this.pname});
  }

  // send message to specific user
  private sendToMessage(toUserId, value) {
    this.send({messageType: "sendTo", toUserId: toUserId, fromUserId: this.pid, value: value, realName: this.pname});
  }

  private receiveVideo(remoteUserId, isCamera) {
    console.log("receiveVideo remoteUserId:" + remoteUserId);
    const participant = new Participant(remoteUserId, false, isCamera, this.send.bind(this));
    this.participants[remoteUserId] = participant;
    participant.start();
  }

  private onBroadcastReady(): void {
    console.log("onBroadcastReady");
    this.setBroadcastingState(true);
  }

  private tryConnectAgain(): void {
    this.reconnection = true;
    this.setError("Reconnecting...");
    setTimeout(function () {
      this.reconnectInterval *= (1.5 + 0.2 * Math.random());
      this.connect();
    }.bind(this), this.reconnectInterval);
  }

  private connect(): void {
    try {
      const pathArray = window.location.pathname.split( '/' );
      if (window.location.pathname.length > 1 && pathArray.length >= 2) {
        this.room = pathArray[pathArray.length - 1];
      }
      const isHttps = location.protocol == "https:";
      const protocol = isHttps ? "wss:" : "ws:";
      // var url = protocol + "//" + location.host + "/stream/" + room;
      const portPart = location.port ? ":" + location.port : (isHttps ? ":443" : "");
      const url = (() => {
        if (location.hostname == "localhost") {
          return "wss://webrtc-showcase.trembit.com:6000/stream/" + this.room;
        } else if (location.port == "4200") {
          return "ws://" + location.hostname + ":9000/stream/" + this.room;
        } else {
          return protocol + "//" + location.hostname + portPart + "/stream/" + this.room;
        }
      })();

      console.log("Connecting to " + url + " from " + window.location.pathname);
      this.socket = new WebSocket(url);
      this.socket.onmessage = this.onSocketMessage.bind(this);
      this.socket.onopen = function (evt) {
        if (this.reconnection) {
          window.location.reload(); // Reloading the page to reset states
          return;
        }
        this.connected = true;
        console.log("websocket on open");
        this.send({messageType: "join", name: this.pname});
      }.bind(this);
      this.socket.onclose = function (evt) {
        this.connected = false;
        this.tryConnectAgain();
      }.bind(this);
      this.socket.onerror = function (evt) {
        console.error("error", evt);
        this.setError("Can't establish socket connection.");
      }.bind(this);
    } catch (e) {
      this.setError("WebSocket connection failed.");
    }
  }

  private send(o): void {
    if (!this.connected) return;
    if (o.messageType != "ping") {
      console.log("Sending " + JSON.stringify(o));
    }
    this.socket.send(JSON.stringify(o));
  }

  private doChangeBroadcast(remoteUserId, value): void {
    if (remoteUserId != this.pid) {
      const existingBroadcast = this.participants[remoteUserId];

      if (existingBroadcast && !value) {
        existingBroadcast.dispose();
        delete this.participants[remoteUserId];
        delete this.usersInRoom[remoteUserId];
      } else if (!existingBroadcast && value) {
        this.receiveVideo(remoteUserId, true);
      }
    }
  }

  private doSendTo(fromUserId, value): void {
    const participant = this.participants[value.broadcastId];
    if (participant) {
      participant[value.method](fromUserId, value);
    }
  }

  private onSocketMessage(e): void {
    const m = JSON.parse(e.data);
    // console.log("onSocketMessage " + m.messageType + " " + e.data.substr(0, 100));
    if (m.messageType == "youAre") {
      this.pid = m.pid;
      console.log("Set pid " + this.pid);
      // $localTextArea.html("Your id is " + this.pid + " in " + this.room);
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

        this.usersNumber = Object.keys(this.usersInRoom).length;
        this.usersList = Object.values(this.usersInRoom).join(', ');
      } else if (m.key.indexOf("broadcast.") == 0) {
        const broadcastUserId = m.key.split(".")[1];
        this.doChangeBroadcast(broadcastUserId, m.value);
      } else if (m.key.indexOf("chat.") == 0) {
        this.chatMessages.push(m);
        this.scrollChatToBottom();
      }
    } else if (m.messageType == "chatClear") {
      this.chatMessages = [];
    } else if (m.messageType == "sendTo") {
      this.doSendTo(m.fromUserId, m.value);
      if (m.realName) {
        // $("#"+ m.fromUserId).find(".username").html(m.realName);
      }
    } else if (m.messageType == "chatMessage") {
      this.chatMessages.push(m);
      this.scrollChatToBottom();
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
      // console.log("onIceCandidateFound received", m);

      this.participants[m.broadcastUserId].onIceCandidateFound(m);
    } else {
      console.log("ERROR: Unhandled message type " + m.messageType);
    }
  }
}
