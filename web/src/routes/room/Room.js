/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import s from './Room.css';
import { Button, FormControl } from 'react-bootstrap';
import { RoomServiceInstance as RoomService } from "../../services/RoomService";

class Room extends React.Component {
  static propTypes = {
    news: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        link: PropTypes.string.isRequired,
        content: PropTypes.string,
      }),
    ).isRequired,
  };


  constructor(props) {
    super(props);

    // const {userName} = RoomService.getInitialData();

    this.state = {
      connected: false,
      roomName: 'default',
      broadcastStarted: false,
      messages: [{ key: '0', value: 'Welcome to room!'}],
      userName: '',
      userCount: 0,
      userNames: ''
    };

    this.textInput = null;
  }

  componentDidMount() {
    RoomService.initSocket(() => {
      const userNames = Object.keys(RoomService.usersInRoom).map(k => RoomService.usersInRoom[k]);
      this.setState({
        connected: RoomService.connected,
        roomName: RoomService.room,
        userName: RoomService.userName,
        messages: RoomService.messages,
        userCount: userNames.length,
        userNames: userNames.join(', ')
      })
    })
  }

  onSendChat() {
    RoomService.sendChatMessage(this.textInput.value);
  }

  onClearChat() {
    RoomService.clearChat();
  }

  onCameraBroadcastClick() {

  }

  onScreenBroadcastClick() {

  }


  render() {
    return (
      <div className={s.root} id="wrapper">
        <div className="panel panel-default">
          <div className="panel-body">
            <section className="video" id="participants">
              {/*<noscript>*/}
                {/*<div className="alert alert-danger text-center" role="alert">*/}
                  {/*<span className="glyphicon glyphicon-warning-sign" aria-hidden="true"></span>*/}
                  {/*Javascript is not enabled.*/}
                {/*</div>*/}
              {/*</noscript>*/}
              <div className="participant hidden" id="me">
                <video className="webcam-me" id="webcam-me" autoPlay="true" muted="muted"></video>
              </div>
            </section>
            <section className="chat">
              <div className="chat-display" id="chatArea">
              </div>
            </section>
          </div>
          <div className="panel-heading">
            <Button bsStyle="success" onClick={() => this.onScreenBroadcastClick()}>{this.state.broadcasting ? 'Stop Share' : 'Share Screen'}</Button>
            <Button bsStyle="success" onClick={() => this.onCameraBroadcastClick()}>{this.state.broadcasting ? 'Stop Broadcast' : 'Start Broadcast'}</Button>
            <p className="playername">
              Your name: <span id="pname" className="name" data-toggle="modal" data-target="#modal-name-query">{this.state.userName}</span> in room: <span id="room" className="room">{this.state.roomName}</span>.
            </p>
            <p className="users">
              Users (<span className="users-number" id="users-number">{ this.state.userCount }</span>): <span className="users-list" id="users-list">{ this.state.userNames}</span>
            </p>
          </div>
          <div className="panel-footer">
            <div>
              {this.state.messages.map(item => (
                <p key={item.key}>
                  {item.value}
                </p>
              ))}
            </div>
            <form className="input-group">
              <span className="input-group-addon">You:</span>
              <FormControl inputRef={input => this.textInput = input}
                           type="text" className="form-control" placeholder="Your message..." />
              <Button bsStyle="primary" onClick={() => this.onSendChat()}>Send</Button>
              <Button bsStyle="danger" onClick={() => this.onClearChat()}>Clear</Button>
            </form>
          </div>
        </div>
      </div>

      // <div className={s.root}>
      //   <div className={s.container}>
      //     <h1>React.js News</h1>
      //     {this.props.news.map(item => (
      //       <article key={item.link} className={s.newsItem}>
      //         <h1 className={s.newsTitle}>
      //           <a href={item.link}>{item.title}</a>
      //         </h1>
      //         <div
      //           className={s.newsDesc}
      //           // eslint-disable-next-line react/no-danger
      //           dangerouslySetInnerHTML={{ __html: item.content }}
      //         />
      //       </article>
      //     ))}
      //   </div>
      // </div>
    );
  }
}

export default withStyles(s)(Room);
