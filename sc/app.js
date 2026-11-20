// ShanX Commander (SC) public informational page, deliberately static.
// No internal network requests, credentials, private machine endpoints, or remote controls.
(() => {
  const show = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  show('live-pill', 'Public development information');
  show('heartbeat', 'Public page: information only');
  show('sc-process', 'Private test environment');
  show('sc-gateway', 'Local alpha only');
  show('sc-remote', 'Not connected');
})();
