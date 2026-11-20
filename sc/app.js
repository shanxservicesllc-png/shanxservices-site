// ShanX Commander (SC) public informational page, deliberately static.
// No internal network requests, credentials, private machine endpoints, or remote controls.
(() => {
  const show = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  show('live-pill', 'Public preview · private pilot verified');
  show('heartbeat', 'Private GREMLIN pilot passed · public checkout not active');
  show('sc-process', 'Private GREMLIN alpha');
  show('sc-gateway', 'Bounded desktop pilot verified');
  show('sc-remote', 'Mr. Who pilot only · customer access not enabled');
})();
