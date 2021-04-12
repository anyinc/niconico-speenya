/* global chrome */
import io from 'socket.io-client';

import { CommentJson, StampJson, Stamp } from '@/messages';

const APP_VERSION = chrome.runtime.getManifest().version;

class SocketClient {
  private socket: SocketIOClient.Socket;

  constructor(private readonly host: string) {
    this.socket = io(host, { autoConnect: false });

    this.socket.on('comment', (comment: CommentJson) => this.sendComment(comment));
    this.socket.on('stamp', (stamp: StampJson) => this.sendStamp(stamp));
  }

  private sendComment(comment: CommentJson): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => chrome.tabs.sendMessage(tab.id ?? 0, {type: "comment", body: comment}));
    });
  }

  private sendStamp(stamp: StampJson): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => chrome.tabs.sendMessage(tab.id ?? 0, {type: "stamp", body: stamp}));
    });
  }

  public connect(): void {
    this.socket.connect();
    this.prefetchStamps();
    console.log(`niconico speenya v${APP_VERSION}: connect to ${this.host}`);
  }

  public disconnect(): void {
    this.socket.disconnect();
    console.log(`niconico speenya v${APP_VERSION}: disconnect from ${this.host}`);
  }

  private prefetchStamps(): void {
    fetch(`${this.host}/api/stamps`)
      .then((res) => res.json())
      .then((json) => {
        (json as Stamp[]).forEach((stamp) => {
          new Image().src = `${this.host}/storage/stamps/${stamp.path}`;
        });
      });
  }

}

const socket = new SocketClient(process.env.SERVER_URL!);

chrome.storage.sync.get({ enabled: true }, (items) => {
  if (items.enabled) {
    socket.connect();
  } else {
    socket.disconnect();
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;

  if (changes.enabled) {
    if (changes.enabled.newValue) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }
});


function extensionIcon(enabled: boolean): chrome.browserAction.TabIconDetails {
  const postfix = enabled ? '' : '_disabled';
  return {
    path: {
      '16': `icons/icon16${postfix}.png`,
      '24': `icons/icon24${postfix}.png`,
      '32': `icons/icon32${postfix}.png`,
    },
  };
}

chrome.storage.sync.get({ enabled: true }, (items) => {
  const enabled = items.enabled as boolean;
  chrome.browserAction.setIcon(extensionIcon(enabled));
});

chrome.browserAction.onClicked.addListener((_tab) => {
  chrome.storage.sync.get({ enabled: true }, (items) => {
    const toggled = !(items.enabled as boolean);
    chrome.storage.sync.set({ enabled: toggled });
    chrome.browserAction.setIcon(extensionIcon(toggled));
  });
});

chrome.contextMenus.create({
  title: 'Show webcam',
  contexts: ['browser_action'],
  onclick: () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => chrome.tabs.sendMessage(tab.id ?? 0, 'show_webcam'));
    });
  },
});
