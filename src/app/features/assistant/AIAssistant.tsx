import { useState } from "react";
import { useLocation } from "react-router";
import { AssistantMascot } from "./AssistantMascot";
import { AssistantPanel } from "./AssistantPanel";

export function AIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AssistantMascot onClick={() => setIsOpen(true)} isOpen={isOpen} />
      <AssistantPanel open={isOpen} onClose={() => setIsOpen(false)} route={location.pathname} />
    </>
  );
}