export async function parseBillWithAI(text: string, image?: string, mimeType?: string) {
  try {
    const response = await fetch("/api/parse-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, image, mimeType }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to parse bill");
    }

    return await response.json();
  } catch (e: any) {
    console.error("Failed to parse bill", e);
    throw e;
  }
}
