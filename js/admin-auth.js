(function() {
  const SESSION_KEY = "BILL_ADMIN_AUTHENTICATED";
  const PASSWORD_SALT = "0cC9XSWVx8hbIM3FdUymCQ==";
  const PASSWORD_HASH = "kE3iDq+olIgXw4cuQRo4Mwt/lWnUl5cW13PVBTV0EaI=";
  const ITERATIONS = 310000;
  const protectedScripts = [
    "media-data.js",
    "js/config.js",
    "js/media-store.js",
    "js/music-options.js",
    "js/admin.js",
    "js/admin-music.js"
  ];

  const gate = document.getElementById("admin-auth");
  const app = document.getElementById("admin-app");
  const form = document.getElementById("admin-auth-form");
  const passwordInput = document.getElementById("admin-password");
  const submitButton = document.getElementById("admin-auth-submit");
  const errorMessage = document.getElementById("admin-auth-error");

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    app.setAttribute("aria-hidden", "false");
    loadProtectedScripts();
  }

  function loadProtectedScripts() {
    let index = 0;
    const loadNext = () => {
      if (index >= protectedScripts.length) return;

      const script = document.createElement("script");
      script.src = protectedScripts[index++];
      script.onload = loadNext;
      script.onerror = () => {
        console.error(`Could not load admin script: ${script.src}`);
        errorMessage.textContent = "Could not load the admin dashboard. Refresh the page to try again.";
        gate.hidden = false;
        app.hidden = true;
        app.setAttribute("aria-hidden", "true");
      };
      document.body.appendChild(script);
    };

    loadNext();
  }

  function decodeBase64(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

  async function passwordMatches(password) {
    if (!window.crypto?.subtle) {
      throw new Error("Secure password verification is unavailable in this browser context.");
    }

    const key = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const derivedBits = await window.crypto.subtle.deriveBits({
      name: "PBKDF2",
      hash: "SHA-256",
      salt: decodeBase64(PASSWORD_SALT),
      iterations: ITERATIONS
    }, key, 256);
    const actualHash = new Uint8Array(derivedBits);
    const expectedHash = decodeBase64(PASSWORD_HASH);

    let difference = actualHash.length ^ expectedHash.length;
    for (let i = 0; i < actualHash.length; i++) {
      difference |= actualHash[i] ^ expectedHash[i];
    }
    return difference === 0;
  }

  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    showApp();
  } else {
    passwordInput.focus();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    errorMessage.textContent = "";
    submitButton.disabled = true;

    try {
      if (await passwordMatches(passwordInput.value)) {
        sessionStorage.setItem(SESSION_KEY, "true");
        passwordInput.value = "";
        showApp();
      } else {
        errorMessage.textContent = "Incorrect password. Please try again.";
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (error) {
      console.error("Could not verify admin password.", error);
      errorMessage.textContent = "Password verification failed. Open this site over HTTPS or localhost and try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
