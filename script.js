
const remoteAudio = document.getElementById('remoteAudio');
const ringtone = document.getElementById('ringtone');
const myIdSpan = document.getElementById('my-id');
const callBtn = document.getElementById('call-btn');
const statusDiv = document.getElementById('status');
const warningDiv = document.getElementById('warning');
const myCustomIdInput = document.getElementById('my-custom-id');

let currentCall = null;
let localStream = null;
let peer = null;
let recorder = null;
let recordedChunks = [];
let isMuted = false;
let isOnHold = false;

function saveCustomId() {
  const customId = myCustomIdInput.value.trim();
  if (customId) {
    localStorage.setItem('customPeerId', customId);
    location.reload();
  }
}

function getCustomPeerId() {
  return localStorage.getItem('customPeerId') || null;
}

function updateStatus(text) {
  statusDiv.textContent = "Status: " + text;
}

function getTodayKey() {
  const today = new Date();
  return 'callCount_' + today.toISOString().split('T')[0];
}

function getCallCount() {
  return parseInt(localStorage.getItem(getTodayKey()) || "0");
}

function incrementCallCount() {
  let count = getCallCount() + 1;
  localStorage.setItem(getTodayKey(), count);
}

function canCallToday() {
  return getCallCount() < 3;
}

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  localStream = stream;

  const id = getCustomPeerId();
  if (!id) return;

  peer = new Peer(id);

  peer.on('open', id => {
    myIdSpan.textContent = id;
  });

  peer.on('call', call => {
    ringtone.play();
    call.answer(localStream);
    call.on('stream', remoteStream => {
      ringtone.pause();
      remoteAudio.srcObject = remoteStream;
      updateStatus("In Call");
    });
    currentCall = call;
  });
}).catch(err => {
  console.error("Media error", err);
});

function callPeer() {
  if (!canCallToday()) {
    warningDiv.style.display = 'block';
    callBtn.disabled = true;
    return;
  }

  const peerId = document.getElementById('peer-id').value;
  if (!peerId || !localStream) return;

  updateStatus("Calling...");
  incrementCallCount();

  const call = peer.call(peerId, localStream);
  call.on('stream', remoteStream => {
    remoteAudio.srcObject = remoteStream;
    updateStatus("In Call");
  });
  currentCall = call;
}

function toggleMute() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
}

function toggleHold() {
  if (!localStream) return;
  isOnHold = !isOnHold;
  localStream.getAudioTracks().forEach(track => track.enabled = !isOnHold);
  updateStatus(isOnHold ? "On Hold" : "In Call");
}

function startRecording() {
  if (!remoteAudio.srcObject) return;
  recorder = new MediaRecorder(remoteAudio.srcObject);
  recordedChunks = [];
  recorder.ondataavailable = e => recordedChunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.click();
  };
  recorder.start();
  updateStatus("Recording...");
}

function endCall() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
  if (remoteAudio.srcObject) {
    remoteAudio.srcObject.getTracks().forEach(track => track.stop());
    remoteAudio.srcObject = null;
  }
  updateStatus("Call Ended");
}
