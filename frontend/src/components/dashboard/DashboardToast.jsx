import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Renders a temporary toast notification that appears at the bottom right of the screen.
 *
 * This component is designed to provide immediate, non-intrusive feedback to the user following an action,
 * such as successfully saving a project or copying a link. It displays a brief text message alongside a success icon
 * and automatically dismisses itself after a predefined duration.
 *
 * The component uses a `useEffect` hook to set up a `setTimeout` timer whenever a valid `message` prop is provided.
 * After 3000 milliseconds (3 seconds), the timer triggers the `onDismiss` callback, signaling the parent
 * component to clear the message state and unmount or hide the toast. It carefully cleans up the timeout if
 * the component unmounts prematurely or if the message changes, preventing memory leaks and erratic behavior.
 *
 * The rendering is conditionally based on the presence of the `message` prop; if the message is falsy, it renders
 * `null`, keeping the DOM clean.
 *
 * @param {Object} props - The properties object passed to this component.
 * @param {string} props.message - The text content to display inside the toast notification. If falsy, the toast is not rendered.
 * @param {Function} props.onDismiss - Callback function automatically invoked after the display duration expires, used to clear the toast.
 * @param {number} props.duration - Optional display duration in milliseconds.
 * @returns {JSX.Element|null} The rendered toast notification `div` element, or `null` if no message is provided.
 */
const DashboardToast = ({ duration = 3000, message, onDismiss }) => {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [duration, message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl" role="status">
      <CheckCircle2 className="text-blue-200" size={20} />
      {message}
    </div>
  );
};

export default DashboardToast;
