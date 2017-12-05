const PARTICIPANT_MAIN_CLASS = 'participant main';
const PARTICIPANT_CLASS = 'participant';


/**
 * Creates a video element for a new participant and handles WebRTC logic
 */
var Participant = function(userId, sendFunction, isLocalUser) {

    var webRtcPeer;

    if (!isLocalUser) {
        var container = document.createElement('div');
        var video = document.createElement('video');
        container.appendChild(video);
        var buttons = document.createElement('div');
        container.appendChild(buttons);
        var nameSpan = document.createElement('span');
        buttons.appendChild(nameSpan);
        document.getElementById('participants').appendChild(container);

        container.className = isPresentMainParticipant() ? PARTICIPANT_CLASS : PARTICIPANT_MAIN_CLASS;
        container.id = name;
        container.onclick = switchContainerClass;
        video.id = 'video-' + name;
        video.autoplay = true;
        video.controls = false;
        buttons.className = "btn-group video-control";
        nameSpan.className = "username";
    } else {
        video = document.getElementById("webcam-me");
        var container = video.parentNode;
        video.id = 'video-' + name;
        video.controls = false;
    }

    function onOfferPresenter(error, offerSdp) {
        if (error) return onError(error);

        sendFunction({
            messageType: "startBroadcast",
            sdp: offerSdp,
            video: true,
            audio: true
        });
    }

    function onOfferViewer(error, offerSdp) {
        if (error) return onError(error);

        sendFunction({
            messageType: "viewBroadcast",
            sdp: offerSdp,
            broadcastUserId: userId
        });
    }

    function onLocalIceCandidate(candidate) {
        //console.log('Local candidate');
        //console.log(candidate);

        sendFunction({
            messageType: "iceCandidateBroadcast",
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
            broadcastUserId: userId
        });
    }

	function switchContainerClass() {
		if (container.className === PARTICIPANT_CLASS) {
			var elements = Array.prototype.slice.call(document.getElementsByClassName(PARTICIPANT_MAIN_CLASS));
			elements.forEach(function(item) {
					item.className = PARTICIPANT_CLASS;
				});

				container.className = PARTICIPANT_MAIN_CLASS;
			} else {
			container.className = PARTICIPANT_CLASS;
		}
	}

	function isPresentMainParticipant() {
		return ((document.getElementsByClassName(PARTICIPANT_MAIN_CLASS)).length != 0);
	}

    return {
        /** Start local broadcast or subscribe remote */
        start: function () {
            return new Promise(function (resolve, reject) {
                console.log("Participant:start " + userId + " isLocal:" + isLocalUser);
                if (isLocalUser) {
                    var constraints = {
                        audio: true,
                        video: {
                            width: 320,
                            framerate: 15
                        }
                    };

                    var options = {
                        localVideo: video,
                        onicecandidate: onLocalIceCandidate,
                        mediaConstraints: constraints
                    };

                    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                        if (error) {
                            console.log("Error in webrtc peer send");
                            console.log(error);
                        }

                        if (error) return onError(error);

                        this.generateOffer(onOfferPresenter);
                    });

                } else {
                    var options = {
                        remoteVideo: video,
                        onicecandidate : onLocalIceCandidate
                    };

                    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
                        if(error) return onError(error);

                        this.generateOffer(onOfferViewer);
                    });
                }
                resolve();
            });
        },

        /** remote message */
        webRtcAnswer: function (msg) {
            webRtcPeer.processAnswer(msg.sdpAnswer);
        },

        /** remote message */
        webRtcProblem: function (msg) {

        },

        /** remote message */
        onIceCandidateFound: function (msg) {
            webRtcPeer.addIceCandidate({
                __module__: "kurento",
                __type__: "IceCandidate",
                candidate: msg.candidate,
                sdpMLineIndex: msg.sdpMLineIndex,
                sdpMid: msg.sdpMid
            }, function (error) {
                if (error) {
                    console.log(error);
                }
            })
        },

        dispose : function() {
            console.log('Disposing participant ' + userId);
            if (isLocalUser) {
                video.src = "";
                video.id = "webcam-me";
            } else {
                container.parentNode.removeChild(container);
            }
            try {
                if (webRtcPeer) {
                    webRtcPeer.dispose();
                    webRtcPeer = null;
                }
            } catch (e) {
                console.error("Weird thing in rtc peer dispose");
                console.error(e);
            }
        }
    };
};
