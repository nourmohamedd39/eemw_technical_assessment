"use client";

import BrandLogo from "./BrandLogo";
import DemoUserPicker from "./DemoUserPicker";
import { useDemoUser } from "./DemoUserContext";

export default function AppHeader({ demoUserId, onDemoUserChange }) {
  const context = useDemoUser();
  const selectedUserId = demoUserId ?? context.demoUserId;
  const handleUserChange = onDemoUserChange || context.setDemoUserId;

  return (
    <header className="topbar">
      <div className="topbar-main">
        <BrandLogo />
      </div>
      <DemoUserPicker value={selectedUserId} onChange={handleUserChange} />
    </header>
  );
}
