declare var kurentoUtils: any
declare var DetectRTC: any

/**
 * Creates a video element for a new participant and handles WebRTC logic
 */
export class Participant {

  private readonly PARTICIPANT_MAIN_CLASS = 'participant main';
  private readonly PARTICIPANT_CLASS = 'participant';

  private readonly userId: string;
  private readonly isLocalUser: boolean;
  private readonly isCamera: boolean;
  private readonly sendFunction: (any) => void;

  // defined in kurento-utils
  private webRtcPeer: any;
  private video: HTMLVideoElement;
  private container: HTMLElement;

  constructor(userId: string, isLocalUser: boolean, isCamera: boolean, sendFunction: (any) => void) {
    this.userId = userId;
    this.isLocalUser = isLocalUser;
    this.isCamera = isCamera;
    this.sendFunction = sendFunction;

    if (!this.isLocalUser) {
      this.container = document.createElement('div');
      this.video = document.createElement('video') as HTMLVideoElement;
      this.container.appendChild(this.video);
      const buttons = document.createElement('div');
      this.container.appendChild(buttons);
      const nameSpan = document.createElement('span');
      buttons.appendChild(nameSpan);
      document.getElementById('participants').appendChild(this.container);

      this.container.className = this.isPresentMainParticipant() ? this.PARTICIPANT_CLASS : this.PARTICIPANT_MAIN_CLASS;
      this.container.id = name;
      // container.onclick = this.switchContainerClass;
      this.video.id = 'video-' + name;
      this.video.autoplay = true;
      this.video.controls = false;
      buttons.className = "btn-group video-control";
      nameSpan.className = "username";
    } else {
      this.video = document.getElementById("webcam-me") as HTMLVideoElement;
      this.container = this.video.parentNode as HTMLElement;
      this.video.id = 'video-' + name;
      this.video.controls = false;
    }
  }

  private onOfferPresenter(error, offerSdp) {
    if (error) return this.webRtcPeer.onError(error);

    this.sendFunction({
      messageType: "startBroadcast",
      sdp: offerSdp,
      video: true,
      audio: true
    });
  }

  private onOfferViewer(error, offerSdp) {
    if (error) return this.webRtcPeer.onError(error);

    this.sendFunction({
      messageType: "viewBroadcast",
      sdp: offerSdp,
      broadcastUserId: this.userId
    });
  }

  private onLocalIceCandidate(candidate) {
    //console.log('Local candidate');
    //console.log(candidate);

    this.sendFunction({
      messageType: "iceCandidateBroadcast",
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      broadcastUserId: this.userId
    });
  }

  private switchContainerClass() {
    if (this.container.className === this.PARTICIPANT_CLASS) {
      var elements = Array.prototype.slice.call(document.getElementsByClassName(this.PARTICIPANT_MAIN_CLASS));
      elements.forEach((item) => {
        item.className = this.PARTICIPANT_CLASS;
      });

      this.container.className = this.PARTICIPANT_MAIN_CLASS;
    } else {
      this.container.className = this.PARTICIPANT_CLASS;
    }
  }

  private isPresentMainParticipant() {
    return ((document.getElementsByClassName(this.PARTICIPANT_MAIN_CLASS)).length != 0);
  }

  start() {
    const windowObj: any = window;
    windowObj.getScreenConstraints = function(sendSource, callback) {
      console.log('getScreenConstraints invoked', sendSource);
      const screen_constraints: any = {};
      if (DetectRTC.browser.name === 'Chrome') {
        screen_constraints.mandatory = {
          chromeMediaSource: 'screen'
          // chromeMediaSourceId: screen_constraints.mandatory.chromeMediaSourceId
        };
        // TODO
      }
      callback(null, screen_constraints);
    };

    return new Promise((resolve, reject) => {
      console.log('Participant:start userId:' + this.userId + ', isLocal:' + this.isLocalUser + ', isCamera:' + this.isCamera);
      if (this.isLocalUser) {

        const options = {
          localVideo: this.video,
          onicecandidate: this.onLocalIceCandidate.bind(this),
          mediaConstraints: this.isCamera ? WebRTCConsts.cameraConstraints : WebRTCConsts.screenConstraints,
          sendSource: this.isCamera ? 'webcam' : 'screen'
        };

        this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, (error) => {
          if (error) {
            console.log("Error in webrtc peer send");
            console.log(error);
          }

          if (error) return this.webRtcPeer.onError(error);

          this.webRtcPeer.generateOffer(this.onOfferPresenter.bind(this));
        });

      } else {
        const options = {
          remoteVideo: this.video,
          onicecandidate : this.onLocalIceCandidate.bind(this)
        };

        this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
          if(error) return this.webRtcPeer.onError(error);

          this.webRtcPeer.generateOffer(this.onOfferViewer.bind(this));
        });
      }
      resolve();
    });
  }

  /** remote message */
  webRtcAnswer(msg) {
    this.webRtcPeer.processAnswer(msg.sdpAnswer);
  }

  /** remote message */
  webRtcProblem(msg) {

  }

  /** remote message */
  onIceCandidateFound(msg) {
    this.webRtcPeer.addIceCandidate({
      __module__: "kurento",
      __type__: "IceCandidate",
      candidate: msg.candidate,
      sdpMLineIndex: msg.sdpMLineIndex,
      sdpMid: msg.sdpMid
    }, (error) => {
      if (error) {
        console.log(error);
      }
    })
  }

  dispose() {
    console.log('Disposing participant ' + this.userId);
    if (this.isLocalUser) {
      this.video.src = "";
      this.video.id = "webcam-me";
    } else {
      if (this.video && this.video.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
    try {
      if (this.webRtcPeer) {
        this.webRtcPeer.dispose();
        this.webRtcPeer = null;
      }
    } catch (e) {
      console.error("Weird thing in rtc peer dispose");
      console.error(e);
    }
  }
}

class WebRTCConsts {

  static readonly cameraConstraints = {
    audio: true,
    video: {
      width: 320,
      framerate: 15
    }
    // audio: {
    //   //Opus is now the default codec for encoding sound in Chrome, Firefox and Safari 11
    //   // https://addpipe.com/blog/audio-constraints-getusermedia/
    //   sampleSize: 16,
    //   channelCount: 2,
    //   echoCancellation: true,
    //   noiseSuppression: false
    // },
    // video: {
      // width: 1280,
      // height: 720
      // width: {
      //   min: 1280,
      //   max: 1280
      // },
      // height: {
      //   min: 720,
      //   max: 720
      // }
    // }
  };

  static readonly screenConstraints = {
    audio: false,
    video: {
      mediaSource: "screen",
      // width: 320,
      framerate: 3
    }
  };
}
