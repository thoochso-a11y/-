// WASM Module Loader for Wisp Protocol
// Loads and initializes the WebAssembly binary decoder/encoder

const WispWasmModule = (() => {
  let instance = null;
  let memory = null;

  async function loadWasm() {
    try {
      const wasmBinary = await fetch('./x/wisp.w').then(r => r.arrayBuffer());
      const importObject = {
        env: {
          memory: memory = new WebAssembly.Memory({ initial: 256, maximum: 512 })
        }
      };
      const wasmModule = await WebAssembly.instantiate(wasmBinary, importObject);
      instance = wasmModule.instance;
      return instance;
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw error;
    }
  }

  return {
    initialize: loadWasm,
    getInstance: () => instance,
    getMemory: () => memory,
    encodePacket: (type, data) => {
      if (!instance) throw new Error('WASM not initialized');
      // Encoding logic using WASM functions
      return instance.exports.encode(type, data);
    },
    decodePacket: (buffer) => {
      if (!instance) throw new Error('WASM not initialized');
      // Decoding logic using WASM functions
      return instance.exports.decode(buffer);
    }
  };
})();

export default WispWasmModule;