// WebSocket Transport Handler for Wisp Protocol
// Manages WebSocket connections and packet routing

addEventListener('message', ({ data: { sab, args: [method, url, body, username, password], body: payload, headers } }) => {
  let view = new DataView(sab);
  let uint8 = new Uint8Array(sab);
  let xhr = new XMLHttpRequest();

  if (xhr.responseType) {
    xhr.responseType = 'arraybuffer';
  }

  xhr.open(method, url, true, username, password);

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState === xhr.HEADERS_RECEIVED) {
      const headersStr = xhr.getAllResponseHeaders();
      const headersLength = new TextEncoder().encode(headersStr).length;
      view.setUint32(0, headersLength, true);
      new Uint8Array(sab, 4).set(new TextEncoder().encode(headersStr));
    } else if (xhr.readyState === xhr.DONE) {
      if (xhr.response) {
        const response = new Uint8Array(xhr.response);
        new Uint8Array(sab, 4 + 8192).set(response);
        view.setUint32(4 + 4096, response.length, true);
      }
    }
  };

  xhr.onerror = () => {
    view.setInt32(0, -1, true);
  };

  if (payload) {
    xhr.send(payload);
  } else {
    xhr.send();
  }
});