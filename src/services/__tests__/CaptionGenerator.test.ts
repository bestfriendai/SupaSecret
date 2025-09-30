import { getCurrentCaptions, CaptionData } from "../CaptionGenerator";

describe("CaptionGenerator", () => {
  describe("getCurrentCaptions", () => {
    const mockCaptionData: CaptionData = {
      segments: [
        {
          text: "Hello world",
          start: 0,
          end: 2,
          words: [
            { word: "Hello", start: 0, end: 1 },
            { word: "world", start: 1, end: 2 },
          ],
        },
        {
          text: "This is a test",
          start: 2,
          end: 5,
          words: [
            { word: "This", start: 2, end: 2.5 },
            { word: "is", start: 2.5, end: 3 },
            { word: "a", start: 3, end: 3.5 },
            { word: "test", start: 3.5, end: 5 },
          ],
        },
      ],
      duration: 5,
      language: "en",
    };

    it("returns null when no words are visible", () => {
      const result = getCurrentCaptions(mockCaptionData, -1);
      expect(result).toBeNull();
    });

    it("returns current visible words", () => {
      const result = getCurrentCaptions(mockCaptionData, 1.5);
      expect(result).toBe("Hello world");
    });

    it("returns multiple words per line", () => {
      const result = getCurrentCaptions(mockCaptionData, 3.2, 2);
      expect(result).toBe("This is\na test");
    });

    it("returns null when time is beyond duration", () => {
      const result = getCurrentCaptions(mockCaptionData, 10);
      expect(result).toBeNull();
    });
  });
});
