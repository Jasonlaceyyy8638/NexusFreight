/** Browser-only: FileReader base64 without data URL prefix */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const data = r.result;
      if (typeof data !== "string") {
        reject(new Error("Unexpected read result"));
        return;
      }
      const i = data.indexOf(",");
      resolve(i >= 0 ? data.slice(i + 1) : data);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
