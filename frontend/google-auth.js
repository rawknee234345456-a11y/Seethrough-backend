(function () {
  function decodeJwt(token) {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json);
  }

  window.initializeGoogleAuth = function initializeGoogleAuth(options) {
    const { clientId, buttonContainerId, onCredential } = options;
    const target = document.getElementById(buttonContainerId);
    if (!target || !window.google || !clientId) {
      return;
    }

    target.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        const profile = decodeJwt(response.credential);
        await onCredential({
          idToken: response.credential,
          name: profile.name || "",
          email: profile.email || ""
        });
      }
    });

    window.google.accounts.id.renderButton(target, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      width: Math.max(280, Math.min(target.clientWidth || 560, 560)),
      text: "continue_with"
    });
  };
})();
