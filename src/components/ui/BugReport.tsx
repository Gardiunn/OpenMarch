import { useEffect } from "react";
import ToolbarSection from "../toolbar/ToolbarSection";
import * as Sentry from "@sentry/electron/renderer";

export const feedbackObj = Sentry.feedbackIntegration({
    autoInject: false,
    showBranding: false,
    messagePlaceholder:
        "What went wrong?\nWhat did you expect?\nHow can we reproduce the issue?",
    enableScreenshot: false,
});
export default function ErrorReport() {
    useEffect(() => {
        feedbackObj.attachTo("#feedback-button", {});
        return () => {
            feedbackObj.remove();
        };
    }, []);

    // If the version is the same, don't show the modal
    return (
        <ToolbarSection aria-label="Feedback">
            <div
                className="cursor-pointer outline-none duration-150 ease-out hover:text-accent focus-visible:-translate-y-4 disabled:pointer-events-none disabled:opacity-5"
                id="feedback-button"
            >
                Report a bug
            </div>
        </ToolbarSection>
    );
}
