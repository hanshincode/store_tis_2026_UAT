(function () {
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const state = {
        peer: null,
        localStream: null,
        cameraTrack: null,
        screenStream: null,
        remoteStream: null,
        isCaller: false,
        isBusy: false,
        micEnabled: true,
        cameraEnabled: true,
        screenSharing: false,
        pendingOffer: null,
        pendingCallerName: '',
        startedAt: null,
        endedByLocal: false,
        callLogSent: false,
        getSocket: null,
        getRoomId: null,
        getCurrentUser: null,
        isStaff: false,
    };

    window.initVideoCall = function initVideoCall(options = {}) {
        state.getSocket = options.getSocket;
        state.getRoomId = options.getRoomId;
        state.getCurrentUser = options.getCurrentUser;
        state.isStaff = Boolean(options.isStaff);
        bindVideoButtons();
    };

    window.handleVideoSignal = async function handleVideoSignal(data) {
        if (!data || !String(data.type || '').startsWith('video_')) return false;
        if (isOwnSignal(data)) return true;

        try {
            switch (data.type) {
                case 'video_call_request':
                    handleIncomingCall(data);
                    break;
                case 'video_call_accept':
                    if (state.isCaller) await createOffer();
                    break;
                case 'video_call_reject':
                    logCallMessage('rejected', 0);
                    showCallStatus('Người nhận đã từ chối cuộc gọi.');
                    setTimeout(endCall, 1200);
                    break;
                case 'video_offer':
                    await acceptOffer(data);
                    break;
                case 'video_answer':
                    if (state.peer && data.answer) {
                        await state.peer.setRemoteDescription(new RTCSessionDescription(data.answer));
                        markConnected();
                        showCallStatus('Đã kết nối.');
                    }
                    break;
                case 'video_ice_candidate':
                    if (state.peer && data.candidate) {
                        await state.peer.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                    break;
                case 'video_call_end':
                    if (state.startedAt && !state.callLogSent) {
                        logCallMessage('ended', getCallDuration());
                    }
                    showCallStatus('Cuộc gọi đã kết thúc.');
                    setTimeout(endCall, 800);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Video call error:', error);
            showCallStatus('Không thể thiết lập cuộc gọi video.');
            setTimeout(endCall, 1200);
        }
        return true;
    };

    window.startVideoCall = async function startVideoCall() {
        if (!ensureCallReady()) return;
        state.isCaller = true;
        state.isBusy = true;
        state.callLogSent = false;
        state.endedByLocal = false;
        openCallModal('Đang gọi khách, chờ trong giây lát...');
        await ensureLocalMedia();
        sendSignal('video_call_request');
    };

    async function acceptIncomingCall() {
        state.isCaller = false;
        state.isBusy = true;
        state.callLogSent = false;
        state.endedByLocal = false;
        openCallModal('Đang kết nối...');
        await ensureLocalMedia();
        sendSignal('video_call_accept');
        if (state.pendingOffer) {
            await acceptOffer(state.pendingOffer);
            state.pendingOffer = null;
        }
    }

    function rejectIncomingCall() {
        sendSignal('video_call_reject');
        logCallMessage('rejected', 0);
        closeIncomingCall();
        resetCallState();
    }

    function bindVideoButtons() {
        document.getElementById('btn-start-video-call')?.addEventListener('click', startVideoCall);
        document.getElementById('btn-accept-video-call')?.addEventListener('click', acceptIncomingCall);
        document.getElementById('btn-reject-video-call')?.addEventListener('click', rejectIncomingCall);
        document.querySelectorAll('[data-video-action="end"]').forEach(button => button.addEventListener('click', () => {
            state.endedByLocal = true;
            if (state.startedAt) {
                logCallMessage('ended', getCallDuration());
            } else {
                logCallMessage('missed', 0);
            }
            sendSignal('video_call_end');
            endCall();
        }));
        document.getElementById('btn-toggle-mic')?.addEventListener('click', toggleMic);
        document.getElementById('btn-toggle-camera')?.addEventListener('click', toggleCamera);
        document.getElementById('btn-share-screen')?.addEventListener('click', toggleScreenShare);
    }

    function ensureCallReady() {
        const socket = getSocket();
        if (!getRoomId()) {
            alert('Vui lòng chọn một cuộc trò chuyện trước khi gọi video.');
            return false;
        }
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            alert('Kết nối chat chưa sẵn sàng. Vui lòng thử lại sau vài giây.');
            return false;
        }
        if (state.isBusy) {
            alert('Bạn đang trong một cuộc gọi khác.');
            return false;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            alert('Trình duyệt không hỗ trợ gọi video.');
            return false;
        }
        return true;
    }

    async function ensureLocalMedia() {
        if (state.localStream) return state.localStream;
        state.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        state.cameraTrack = state.localStream.getVideoTracks()[0] || null;
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = state.localStream;
        return state.localStream;
    }

    async function createPeer() {
        if (state.peer) return state.peer;
        state.peer = new RTCPeerConnection(rtcConfig);
        state.remoteStream = new MediaStream();

        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo) remoteVideo.srcObject = state.remoteStream;

        state.peer.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('video_ice_candidate', { candidate: event.candidate });
            }
        };

        state.peer.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => state.remoteStream.addTrack(track));
            markConnected();
            showCallStatus('Đã kết nối.');
        };

        const stream = await ensureLocalMedia();
        stream.getTracks().forEach(track => state.peer.addTrack(track, stream));
        return state.peer;
    }

    async function createOffer() {
        openCallModal('Đang kết nối...');
        const peer = await createPeer();
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal('video_offer', { offer });
    }

    async function acceptOffer(data) {
        openCallModal('Đang kết nối...');
        const peer = await createPeer();
        await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal('video_answer', { answer });
    }

    function handleIncomingCall(data) {
        if (state.isBusy) {
            sendSignal('video_call_reject', { reason: 'busy' });
            return;
        }
        state.pendingCallerName = data.sender_name || 'Người dùng';
        const nameEl = document.getElementById('incoming-caller-name');
        if (nameEl) nameEl.textContent = state.pendingCallerName;
        document.getElementById('incoming-call-panel')?.classList.remove('d-none');
    }

    function sendSignal(type, extra = {}) {
        const socket = getSocket();
        const user = getCurrentUser();
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({
            type,
            room_id: getRoomId(),
            sender_id: user?.id || null,
            sender_name: getDisplayName(user),
            is_staff: state.isStaff,
            ...extra,
        }));
    }

    function logCallMessage(status, durationSeconds) {
        if (status === 'ended' && !durationSeconds) return;
        if (state.callLogSent) return;
        const socket = getSocket();
        const user = getCurrentUser();
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        state.callLogSent = true;
        socket.send(JSON.stringify({
            type: 'message',
            message: JSON.stringify({
                kind: 'video_call',
                status,
                duration_seconds: Math.max(0, Math.round(durationSeconds || 0)),
                actor_name: getDisplayName(user),
                actor_is_staff: state.isStaff,
            }),
            sender_id: user?.id || null,
            sender_name: getDisplayName(user),
            is_staff: state.isStaff,
        }));
    }

    function markConnected() {
        if (!state.startedAt) {
            state.startedAt = Date.now();
        }
    }

    function getCallDuration() {
        return state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0;
    }

    function isOwnSignal(data) {
        const user = getCurrentUser();
        return user?.id && data.sender_id && String(user.id) === String(data.sender_id);
    }

    function getSocket() {
        return typeof state.getSocket === 'function' ? state.getSocket() : null;
    }

    function getRoomId() {
        return typeof state.getRoomId === 'function' ? state.getRoomId() : null;
    }

    function getCurrentUser() {
        return typeof state.getCurrentUser === 'function' ? state.getCurrentUser() : null;
    }

    function getDisplayName(user) {
        if (!user) return state.isStaff ? 'TIS Broker' : 'Khách hàng';
        return `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.full_name || user.username;
    }

    function openCallModal(statusText) {
        closeIncomingCall();
        document.getElementById('video-call-modal')?.classList.remove('d-none');
        showCallStatus(statusText);
    }

    function closeIncomingCall() {
        document.getElementById('incoming-call-panel')?.classList.add('d-none');
    }

    function showCallStatus(text) {
        const status = document.getElementById('video-call-status');
        if (status) status.textContent = text;
    }

    function toggleMic() {
        state.micEnabled = !state.micEnabled;
        state.localStream?.getAudioTracks().forEach(track => { track.enabled = state.micEnabled; });
        const icon = document.querySelector('#btn-toggle-mic i');
        if (icon) icon.className = state.micEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    }

    function toggleCamera() {
        state.cameraEnabled = !state.cameraEnabled;
        if (state.cameraTrack) state.cameraTrack.enabled = state.cameraEnabled;
        const icon = document.querySelector('#btn-toggle-camera i');
        if (icon) icon.className = state.cameraEnabled ? 'fas fa-video' : 'fas fa-video-slash';
    }

    async function toggleScreenShare() {
        if (state.screenSharing) {
            await stopScreenShare();
            return;
        }
        if (!navigator.mediaDevices?.getDisplayMedia) {
            alert('Trình duyệt không hỗ trợ chia sẻ màn hình.');
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;

            await replaceOutgoingVideoTrack(screenTrack);
            state.screenStream = screenStream;
            state.screenSharing = true;
            updateScreenShareButton(true);
            showCallStatus('Bạn đang chia sẻ màn hình.');

            const localVideo = document.getElementById('local-video');
            if (localVideo) localVideo.srcObject = screenStream;

            screenTrack.onended = () => {
                stopScreenShare();
            };
        } catch (error) {
            if (error.name !== 'NotAllowedError') {
                console.error('Screen share error:', error);
                alert('Không thể chia sẻ màn hình. Vui lòng thử lại.');
            }
        }
    }

    async function stopScreenShare() {
        if (!state.screenSharing) return;
        state.screenStream?.getTracks().forEach(track => track.stop());
        state.screenStream = null;
        state.screenSharing = false;

        await ensureLocalMedia();
        if (state.cameraTrack) {
            await replaceOutgoingVideoTrack(state.cameraTrack);
        }

        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = state.localStream;
        updateScreenShareButton(false);
        showCallStatus('Đã dừng chia sẻ màn hình.');
    }

    async function replaceOutgoingVideoTrack(track) {
        if (!state.peer) return;
        const sender = state.peer.getSenders().find(item => item.track && item.track.kind === 'video');
        if (sender) {
            await sender.replaceTrack(track);
        }
    }

    function updateScreenShareButton(isSharing) {
        const button = document.getElementById('btn-share-screen');
        const icon = button?.querySelector('i');
        if (!button || !icon) return;
        button.classList.toggle('btn-warning', isSharing);
        button.classList.toggle('btn-light', !isSharing);
        icon.className = isSharing ? 'fas fa-desktop' : 'fas fa-display';
        button.title = isSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình';
    }

    function endCall() {
        closeIncomingCall();
        document.getElementById('video-call-modal')?.classList.add('d-none');
        resetCallState();
    }

    function resetCallState() {
        state.peer?.close();
        state.peer = null;
        state.screenStream?.getTracks().forEach(track => track.stop());
        state.screenStream = null;
        state.localStream?.getTracks().forEach(track => track.stop());
        state.localStream = null;
        state.cameraTrack = null;
        state.remoteStream = null;
        state.isCaller = false;
        state.isBusy = false;
        state.pendingOffer = null;
        state.startedAt = null;
        state.endedByLocal = false;
        state.callLogSent = false;
        state.micEnabled = true;
        state.cameraEnabled = true;
        state.screenSharing = false;
        updateScreenShareButton(false);

        const localVideo = document.getElementById('local-video');
        const remoteVideo = document.getElementById('remote-video');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    }
})();
