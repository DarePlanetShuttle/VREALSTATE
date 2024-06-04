class VRButton {
	static createButton(renderer) {
		const button = document.createElement('button');

		function showEnterVR() {
			let currentSession = null;

			async function onSessionStarted(session) {
				session.addEventListener('end', onSessionEnded);
				await renderer.xr.setSession(session);
				button.textContent = 'EXIT VR';
				currentSession = session;
			}

			function onSessionEnded() {
				currentSession.removeEventListener('end', onSessionEnded);
				button.textContent = 'ENTER VR';
				currentSession = null;
			}

			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';
			button.textContent = 'ENTER VR';

			button.onmouseenter = function () {
				button.style.opacity = '1.0';
			};

			button.onmouseleave = function () {
				button.style.opacity = '0.5';
			};

			button.onclick = function () {
				if (currentSession === null) {
					navigator.xr.requestSession('immersive-vr').then(onSessionStarted);
				} else {
					currentSession.end();
				}
			};

			if (navigator.xr && navigator.xr.isSessionSupported) {
				navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
					supported ? showEnterVR() : showWebXRNotFound();
				}).catch(showWebXRNotFound);
			} else {
				showWebXRNotFound();
			}
		}

		function showWebXRNotFound() {
			button.style.display = '';
			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';
			button.textContent = 'VR NOT SUPPORTED';
		}

		button.id = 'VRButton';
		button.style.display = 'none';
		button.style.position = 'absolute';
		button.style.bottom = '20px';
		button.style.padding = '12px 6px';
		button.style.border = '1px solid #fff';
		button.style.borderRadius = '4px';
		button.style.background = 'rgba(0,0,0,0.1)';
		button.style.color = '#fff';
		button.style.font = 'normal 13px sans-serif';
		button.style.textAlign = 'center';
		button.style.opacity = '0.5';
		button.style.outline = 'none';
		button.style.zIndex = '999';

		document.body.appendChild(button);

		showEnterVR();
		
		return button;
	}
}

export { VRButton };