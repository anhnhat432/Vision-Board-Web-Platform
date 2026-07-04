import { useEffect, useState } from "react";

export function useTypingEffect(text: string, speed = 6, shouldReduce = false) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (shouldReduce) {
      setDisplayedText(text);
      return;
    }

    setDisplayedText("");
    if (!text) return;

    let index = 0;
    let currentText = "";

    const timer = setInterval(() => {
      if (index < text.length) {
        currentText += text.charAt(index);
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => {
      clearInterval(timer);
    };
  }, [text, speed, shouldReduce]);

  return displayedText;
}