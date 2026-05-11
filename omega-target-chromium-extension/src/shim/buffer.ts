// Minimal browser-compatible shim for Node.js `buffer` module.
// Only implements the subset used by this package:
// `new Buffer(str, "base64").toString("utf8")` — decode a base64 string.

class Buffer {
  private readonly bytes: Uint8Array;

  constructor(input: string, encoding?: string) {
    if (encoding === "base64") {
      const binary = atob(input);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      this.bytes = bytes;
    } else {
      this.bytes = new TextEncoder().encode(input);
    }
  }

  toString(encoding?: string): string {
    if (encoding === "base64") {
      let binary = "";
      for (const b of this.bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }
    return new TextDecoder(encoding ?? "utf-8").decode(this.bytes);
  }
}

export { Buffer };
export default { Buffer };
